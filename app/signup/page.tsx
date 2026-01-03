'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { getAgencies } from '@/services/agency-service';
import { getUnitsByAgency, getHierarchyByAgency } from '@/services/organizational-hierarchy-service';
import { registerUser } from '@/lib/auth-service';
import type { OrganizationalHierarchyEntry } from '@/services/organizational-hierarchy-service';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    code: '',
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    agencyName: '',
    unitName: '',
  });
  const [agencies, setAgencies] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hierarchyInfo, setHierarchyInfo] = useState<OrganizationalHierarchyEntry | null>(null);
  const [autoFilledData, setAutoFilledData] = useState<{
    rank?: string;
    role?: string;
    unitManager?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && currentUser) {
      router.push('/strategic-planning');
    }
  }, [currentUser, authLoading, router]);

  // Load agencies
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        const agencyList = await getAgencies();
        setAgencies(agencyList);
      } catch (error) {
        console.error('Error loading agencies:', error);
      }
    };
    loadAgencies();
  }, []);

  // Load units when agency is selected
  useEffect(() => {
    const loadUnits = async () => {
      if (!formData.agencyName) {
        setUnits([]);
        setHierarchyInfo(null);
        setAutoFilledData(null);
        return;
      }

      try {
        const unitList = await getUnitsByAgency(formData.agencyName);
        setUnits(unitList);
      } catch (error) {
        console.error('Error loading units:', error);
        setUnits([]);
      }
    };
    loadUnits();
  }, [formData.agencyName]);


  const handleNameChange = async (name: string) => {
    setFormData({ ...formData, name });
    
    if (!name || !formData.agencyName) {
      setHierarchyInfo(null);
      setAutoFilledData(null);
      setNameSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Search hierarchy entries for this agency
      const entries = await getHierarchyByAgency(formData.agencyName);
      
      // Try to match name (case-insensitive, flexible matching)
      // Normalize: remove periods, normalize spaces, uppercase
      const normalizeName = (n: string) => {
        return n.trim()
          .toUpperCase()
          .replace(/\./g, '') // Remove periods
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();
      };
      
      const normalizedInput = normalizeName(name);
      
      // Generate suggestions (names that start with or contain the input)
      if (normalizedInput.length >= 2) {
        const suggestions = entries
          .filter(e => {
            const normalizedEntry = normalizeName(e.name);
            return normalizedEntry.includes(normalizedInput) || normalizedInput.includes(normalizedEntry.substring(0, normalizedInput.length));
          })
          .map(e => e.name)
          .slice(0, 10); // Limit to 10 suggestions
        setNameSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0 && name.length > 0);
      } else {
        setNameSuggestions([]);
        setShowSuggestions(false);
      }
      
      const entry = entries.find(e => {
        const normalizedEntry = normalizeName(e.name);
        // Exact match
        if (normalizedEntry === normalizedInput) return true;
        // Contains match (either direction)
        if (normalizedEntry.includes(normalizedInput) || normalizedInput.includes(normalizedEntry)) return true;
        // Try matching without middle initials (e.g., "MARIA ESTRELLA C MATUNOG" vs "MARIA ESTRELLA MATUNOG")
        const inputNoMiddle = normalizedInput.replace(/\s+[A-Z]\s+/g, ' ').replace(/\s+/g, ' ').trim();
        const entryNoMiddle = normalizedEntry.replace(/\s+[A-Z]\s+/g, ' ').replace(/\s+/g, ' ').trim();
        if (inputNoMiddle === entryNoMiddle && inputNoMiddle.length > 0) return true;
        return false;
      });
      
      if (entry) {
        setHierarchyInfo(entry);
        
        // Determine role from rank
        const role = (entry.rank === 'ADV' || entry.rank === 'AUM') ? 'advisor' : 'leader';
        
        setAutoFilledData({
          rank: entry.rank,
          role,
          unitManager: entry.unitManager,
        });

        // Auto-select unit logic:
        // 1. If they have a unitManager, select that
        // 2. If they're an ADD/SUM/UM without a unitManager, select themselves
        if (!formData.unitName) {
          if (entry.unitManager) {
            const unitManagerName: string = entry.unitManager;
            setFormData(prev => ({ ...prev, unitName: unitManagerName }));
          } else if (entry.rank === 'ADD' || entry.rank === 'SUM' || entry.rank === 'UM') {
            // ADDs, SUMs, and UMs can select themselves as unit
            setFormData(prev => ({ ...prev, unitName: entry.name }));
          }
        }
        setShowSuggestions(false); // Hide suggestions when exact match found
      } else {
        setHierarchyInfo(null);
        setAutoFilledData(null);
      }
    } catch (error) {
      console.error('Error looking up user in hierarchy:', error);
      setHierarchyInfo(null);
      setAutoFilledData(null);
      setNameSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.code || !formData.name || !formData.password || !formData.agencyName || !formData.unitName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if user exists in hierarchy
    if (!hierarchyInfo || !autoFilledData) {
      setError('Name not found in organizational hierarchy. Please contact your administrator.');
      return;
    }

    setLoading(true);

    try {
      // Use provided email, or generate from code if not provided
      const email = formData.email.trim() || `${formData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}@cma.local`;

      // Determine unitManager from selected unitName
      // If user selected themselves as unit, they have no unitManager (undefined)
      // Otherwise, the selected unitName is their unitManager
      let unitManager: string | undefined;
      if (formData.unitName === formData.name) {
        // User selected themselves - they are the unit manager (no manager above them)
        unitManager = undefined;
      } else {
        // User selected someone else - that person is their unit manager
        unitManager = formData.unitName;
      }

      // Register user
      const result = await registerUser({
        email,
        code: formData.code,
        password: formData.password,
        name: formData.name,
        role: autoFilledData.role as 'admin' | 'leader' | 'advisor',
        rank: autoFilledData.rank as 'ADMIN' | 'ADD' | 'SUM' | 'UM' | 'AUM' | 'ADV',
        unitManager: unitManager,
        agencyName: formData.agencyName,
      }, 'self-signup');

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login?message=Account created successfully. Please log in.');
        }, 2000);
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (currentUser) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
            <p className="text-slate-600 mb-6">
              Sign up using your advisor/leader code and select your agency and unit from the organizational hierarchy.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">
                Account created successfully! Redirecting to login...
              </div>
            )}

            {autoFilledData && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Auto-detected:</strong> {autoFilledData.role?.toUpperCase()} ({autoFilledData.rank})
                  {autoFilledData.unitManager && ` - Unit Manager: ${autoFilledData.unitManager}`}
                </p>
              </div>
            )}
            
            {formData.name && formData.agencyName && !hierarchyInfo && !autoFilledData && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Name not found:</strong> "{formData.name}" was not found in the organizational hierarchy for "{formData.agencyName}".
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Please ensure the name matches exactly as it appears in the hierarchy. The "Create Account" button will be enabled once your name is found.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Advisor/Leader Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  placeholder="Enter your code"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => {
                    if (nameSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking on them
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  placeholder="Enter your full name as it appears in the organization"
                  required
                  autoComplete="name"
                  list="name-suggestions"
                />
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {nameSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, name: suggestion });
                          handleNameChange(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none border-b border-slate-100 last:border-b-0"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Your name must match the organizational hierarchy
                </p>
              </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                        placeholder="Enter your email (optional - for email login)"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        If provided, you can sign in with either your code or email. If not provided, a code-based email will be generated.
                      </p>
                    </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Agency *
                </label>
                <select
                  value={formData.agencyName}
                  onChange={(e) => {
                    setFormData({ ...formData, agencyName: e.target.value, unitName: '', name: '' });
                    setHierarchyInfo(null);
                    setAutoFilledData(null);
                    setNameSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  required
                >
                  <option value="">-- Select Agency --</option>
                  {agencies.map(agency => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Unit *
                </label>
                <select
                  value={formData.unitName}
                  onChange={(e) => {
                    setFormData({ ...formData, unitName: e.target.value });
                    // Don't clear hierarchy info on unit change - user might be adjusting
                  }}
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  required
                  disabled={!formData.agencyName || units.length === 0}
                >
                  <option value="">-- Select Unit --</option>
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
                {formData.agencyName && units.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    No units found. Please ensure the hierarchy has been imported for this agency.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-3 pr-12 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full p-3 pr-12 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                    placeholder="Re-enter your password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !hierarchyInfo || !autoFilledData}
                className="w-full bg-[#D31145] text-white font-bold py-3 rounded-lg hover:bg-[#B00E3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <a href="/login" className="text-[#D31145] font-semibold hover:underline">
                  Log in
                </a>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

