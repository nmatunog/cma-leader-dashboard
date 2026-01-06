'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { getAgencies } from '@/services/agency-service';
import { getHierarchyByAgency } from '@/services/organizational-hierarchy-service';
import { registerUser } from '@/lib/auth-service';
import type { OrganizationalHierarchyEntry } from '@/services/organizational-hierarchy-service';
import { Eye, EyeOff } from 'lucide-react';
import { AIChatbot } from '@/components/signup/ai-chatbot';
import { ChatbotSignup } from '@/components/signup/chatbot-signup';
import type { ChatContext } from '@/services/ai-chat-service';
import { formatDisplayName } from '@/lib/utils/name-formatter';
import type { CollectedSignupData } from '@/components/signup/signup-flow-state';

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
    unitManager: '',
    unitManagerOther: '', // For manual entry when "Others" is selected
    role: 'advisor' as 'advisor' | 'leader',
    rank: 'ADV' as 'ADMIN' | 'ADD' | 'SUM' | 'UM' | 'AUM' | 'ADV',
  });
  const [agencies, setAgencies] = useState<string[]>([]);
  const [unitManagers, setUnitManagers] = useState<string[]>([]);
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
  const [showUnitManagerOther, setShowUnitManagerOther] = useState(false);
  const [showAgencyOther, setShowAgencyOther] = useState(false);
  const [agencyOther, setAgencyOther] = useState('');
  const [useChatbot, setUseChatbot] = useState(true); // Default to chatbot mode

  // Build chat context for AI chatbot
  const chatContext: ChatContext = {
    currentFormState: {
      code: formData.code,
      name: formData.name,
      email: formData.email,
      agencyName: formData.agencyName,
      unitName: formData.unitManager || formData.unitManagerOther,
      hasHierarchyMatch: !!hierarchyInfo,
    },
    availableAgencies: agencies,
    availableUnits: unitManagers,
  };

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

  // Load unit managers when agency is selected
  useEffect(() => {
    const loadUnitManagers = async () => {
      if (!formData.agencyName || formData.agencyName === 'Other' || formData.agencyName === 'No Agency') {
        setUnitManagers([]);
        setHierarchyInfo(null);
        setAutoFilledData(null);
        return;
      }

      try {
        const entries = await getHierarchyByAgency(formData.agencyName);
        // Get all unique unit managers (leaders) from the hierarchy
        const managers = new Set<string>();
        entries.forEach(entry => {
          if (entry.unitManager) {
            managers.add(entry.unitManager);
          }
          // Also include leaders themselves (UM, SUM, ADD) as potential unit managers
          if (entry.rank === 'UM' || entry.rank === 'SUM' || entry.rank === 'ADD') {
            managers.add(entry.name);
          }
        });
        setUnitManagers(Array.from(managers).sort());
      } catch (error) {
        console.error('Error loading unit managers:', error);
        setUnitManagers([]);
      }
    };
    loadUnitManagers();
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

        // Auto-select unit manager logic:
        // 1. If they have a unitManager, select that
        // 2. If they're an ADD/SUM/UM without a unitManager, they manage themselves
        if (!formData.unitManager) {
          if (entry.unitManager) {
            setFormData(prev => ({ ...prev, unitManager: entry.unitManager! }));
          } else if (entry.rank === 'ADD' || entry.rank === 'SUM' || entry.rank === 'UM') {
            // ADDs, SUMs, and UMs manage their own units
            setFormData(prev => ({ ...prev, unitManager: entry.name }));
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
    if (!formData.code || !formData.name || !formData.password || !formData.agencyName) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate agency
    if (formData.agencyName === 'Other' && !agencyOther.trim()) {
      setError('Please enter the agency name');
      return;
    }

    // Validate unit manager
    if (!formData.unitManager) {
      setError('Please select or enter a unit manager');
      return;
    }
    if (formData.unitManager === 'Others' && !formData.unitManagerOther.trim()) {
      setError('Please enter the unit manager name');
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

    // No longer require hierarchy match - allow manual entry

    setLoading(true);

    try {
      // Use provided email, or generate from code if not provided
      const email = formData.email.trim() || `${formData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}@cma.local`;

      // Determine final agency name
      let finalAgencyName = formData.agencyName;
      if (formData.agencyName === 'Other') {
        finalAgencyName = agencyOther.trim();
      } else if (formData.agencyName === 'No Agency') {
        finalAgencyName = 'No Agency';
      }

      // Determine unitManager
      let finalUnitManager: string | undefined;
      if (formData.unitManager === 'Others') {
        finalUnitManager = formData.unitManagerOther.trim();
      } else if (formData.unitManager) {
        finalUnitManager = formData.unitManager;
      }

      // Use auto-filled data if available, otherwise use form selections
      const role = autoFilledData?.role || formData.role;
      const rank = autoFilledData?.rank || formData.rank;

      // Register user
      const result = await registerUser({
        email,
        code: formData.code,
        password: formData.password,
        name: formData.name,
        role: role as 'admin' | 'leader' | 'advisor',
        rank: rank as 'ADMIN' | 'ADD' | 'SUM' | 'UM' | 'AUM' | 'ADV',
        unitManager: finalUnitManager,
        agencyName: finalAgencyName,
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
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
                <button
                  onClick={() => setUseChatbot(!useChatbot)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors border border-slate-200"
                  title={useChatbot ? 'Switch to traditional form' : 'Switch to chatbot'}
                >
                  {useChatbot ? '📝 Use Form' : '💬 Use Chatbot'}
                </button>
              </div>
              <p className="text-slate-600">
                {useChatbot 
                  ? '✨ Sign up using our interactive chatbot assistant - the fastest and easiest way to create your account!'
                  : 'Sign up using your advisor/leader code. Enter your name, select your agency and unit manager.'}
              </p>
            </div>

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

            {useChatbot ? (
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg border border-blue-200 font-medium">
                    <span className="text-base">💬</span>
                    <span>Chatbot Mode</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Recommended</span>
                  </span>
                </div>
                <ChatbotSignup 
                  onComplete={async (data: CollectedSignupData) => {
                    // Account creation is handled within ChatbotSignup component
                    // This callback is called after successful account creation
                    setSuccess(true);
                    setError(null);
                    // Redirect is handled by ChatbotSignup component
                  }}
                  onCancel={() => setUseChatbot(false)}
                />
              </div>
            ) : (
              <div className="mb-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                    <span className="text-base">📝</span>
                    <span>Traditional Form</span>
                  </span>
                </div>
              </div>
            )}

            {!useChatbot && (
              <>
                {autoFilledData && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Auto-detected:</strong> {autoFilledData.role?.toUpperCase()} ({autoFilledData.rank})
                      {autoFilledData.unitManager && ` - Unit Manager: ${formatDisplayName(autoFilledData.unitManager)}`}
                    </p>
                  </div>
                )}
                
                {formData.name && formData.agencyName && formData.agencyName !== 'Other' && formData.agencyName !== 'No Agency' && !hierarchyInfo && !autoFilledData && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>ℹ️ Name not found in hierarchy:</strong> "{formData.name}" was not found in the organizational hierarchy for "{formData.agencyName}".
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      You can still create your account. Please select your role and rank below.
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
                  Enter your full name. If found in the hierarchy, your role and rank will be auto-filled.
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
                    const selectedAgency = e.target.value;
                    setFormData({ ...formData, agencyName: selectedAgency, unitManager: '' });
                    setShowAgencyOther(selectedAgency === 'Other');
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
                  <option value="Other">Other</option>
                  <option value="No Agency">No Agency</option>
                </select>
                {showAgencyOther && (
                  <input
                    type="text"
                    value={agencyOther}
                    onChange={(e) => setAgencyOther(e.target.value)}
                    className="w-full p-3 mt-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                    placeholder="Enter agency name"
                    required={formData.agencyName === 'Other'}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Unit Manager *
                </label>
                <select
                  value={formData.unitManager}
                  onChange={(e) => {
                    const selectedManager = e.target.value;
                    setFormData({ ...formData, unitManager: selectedManager });
                    setShowUnitManagerOther(selectedManager === 'Others');
                  }}
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  required
                  disabled={!formData.agencyName || formData.agencyName === 'Other' || formData.agencyName === 'No Agency'}
                >
                  <option value="">-- Select Unit Manager --</option>
                  {unitManagers.map(manager => (
                    <option key={manager} value={manager}>{formatDisplayName(manager)}</option>
                  ))}
                  <option value="Others">Others (Enter manually)</option>
                </select>
                {showUnitManagerOther && (
                  <input
                    type="text"
                    value={formData.unitManagerOther}
                    onChange={(e) => setFormData({ ...formData, unitManagerOther: e.target.value })}
                    className="w-full p-3 mt-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                    placeholder="Enter unit manager name"
                    required={formData.unitManager === 'Others'}
                  />
                )}
                {formData.agencyName && formData.agencyName !== 'Other' && formData.agencyName !== 'No Agency' && unitManagers.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    No unit managers found. You can select "Others" to enter manually.
                  </p>
                )}
                {(formData.agencyName === 'Other' || formData.agencyName === 'No Agency') && (
                  <input
                    type="text"
                    value={formData.unitManagerOther}
                    onChange={(e) => setFormData({ ...formData, unitManagerOther: e.target.value })}
                    className="w-full p-3 mt-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                    placeholder="Enter unit manager name"
                    required
                  />
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

              {/* Role and Rank selection (shown when name not found in hierarchy) */}
              {(!hierarchyInfo || !autoFilledData) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as 'advisor' | 'leader';
                        setFormData({ 
                          ...formData, 
                          role: newRole,
                          rank: newRole === 'leader' ? 'AUM' : 'ADV'
                        });
                      }}
                      className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                      required
                    >
                      <option value="advisor">Advisor</option>
                      <option value="leader">Leader</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Rank *
                    </label>
                    <select
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: e.target.value as typeof formData.rank })}
                      className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                      required
                    >
                      {formData.role === 'leader' ? (
                        <>
                          <option value="AUM">AUM (Associate Unit Manager)</option>
                          <option value="UM">UM (Unit Manager)</option>
                          <option value="SUM">SUM (Senior Unit Manager)</option>
                          <option value="ADD">ADD (Agency/District Director)</option>
                        </>
                      ) : (
                        <option value="ADV">ADV (Advisor)</option>
                      )}
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
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
              </>
            )}
          </div>
        </div>
      </main>

      {/* AI Chatbot (only show when using form mode) */}
      {!useChatbot && <AIChatbot context={chatContext} />}
    </div>
  );
}

