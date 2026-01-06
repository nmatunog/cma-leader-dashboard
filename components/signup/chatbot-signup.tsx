'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import type { SignupFlowState, SignupStep, CollectedSignupData } from './signup-flow-state';
import { INITIAL_SIGNUP_STATE } from './signup-flow-state';
import { 
  matchNameInHierarchy, 
  matchUnitManagerName, 
  checkAgencyExists,
  normalizeNameForMatching 
} from '@/services/name-matching-service';
import { formatDisplayName } from '@/lib/utils/name-formatter';
import { HARDCODED_HIERARCHY_DATA } from '@/lib/hierarchy-data';
import type { OrganizationalHierarchyEntry } from '@/services/organizational-hierarchy-service';
import { registerUser } from '@/lib/auth-service';
import { getFullName } from './signup-flow-state';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotSignupProps {
  onComplete?: (data: CollectedSignupData) => void;
  onCancel?: () => void;
}

export function ChatbotSignup({ onComplete, onCancel }: ChatbotSignupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "👋 Welcome! I'm here to help you create your account. Let's get started!\n\nFirst, please provide your email address (any working email is accepted).",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [flowState, setFlowState] = useState<SignupFlowState>(INITIAL_SIGNUP_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component mounts or when processing completes
  useEffect(() => {
    if (!isProcessing) {
      inputRef.current?.focus();
    }
  }, [isProcessing, messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const updateFlowState = (updates: Partial<SignupFlowState>) => {
    setFlowState((prev) => ({ ...prev, ...updates }));
  };

  const handleUserInput = async (userInput: string) => {
    if (!userInput.trim() || isProcessing) return;

    // Add user message
    addMessage('user', userInput.trim());
    setInput('');
    setIsProcessing(true);

    try {
      // Process the input based on current step
      await processStep(userInput.trim());
    } catch (error) {
      console.error('Error processing step:', error);
      addMessage(
        'assistant',
        'I encountered an error processing your input. Please try again or contact support if the issue persists.'
      );
      updateFlowState({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const processStep = async (userInput: string) => {
    const trimmedInput = userInput.trim();

    switch (flowState.step) {
      case 'email':
        await handleEmailStep(trimmedInput);
        break;
      case 'code':
        await handleCodeStep(trimmedInput);
        break;
      case 'lastName':
        await handleLastNameStep(trimmedInput);
        break;
      case 'firstName':
        await handleFirstNameStep(trimmedInput);
        break;
      case 'middleName':
        await handleMiddleNameStep(trimmedInput);
        break;
      case 'unitManager':
        await handleUnitManagerStep(trimmedInput);
        break;
      case 'agency':
        await handleAgencyStep(trimmedInput);
        break;
      case 'password':
        await handlePasswordStep(trimmedInput);
        break;
      case 'confirm':
        await handleConfirmStep(trimmedInput);
        break;
      default:
        addMessage('assistant', "I'm not sure what to do with that. Please follow the prompts.");
    }
  };

  const handleEmailStep = async (input: string) => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
      addMessage(
        'assistant',
        "That doesn't look like a valid email address. Please enter a valid email (e.g., yourname@example.com)."
      );
      return;
    }

    updateFlowState({
      collectedData: { ...flowState.collectedData, email: input },
      step: 'code',
    });

    addMessage(
      'assistant',
      'Great! Now, please enter your advisor/leader code number.'
    );
  };

  const handleCodeStep = async (input: string) => {
    if (!input || input.trim().length === 0) {
      addMessage('assistant', 'Please enter a valid code number.');
      return;
    }

    updateFlowState({
      collectedData: { ...flowState.collectedData, code: input.toUpperCase() },
      step: 'lastName',
    });

    addMessage(
      'assistant',
      'Perfect! Now, let\'s get your name. Please enter your last name (surname).'
    );
  };

  const handleLastNameStep = async (input: string) => {
    if (!input || input.trim().length === 0) {
      addMessage('assistant', 'Please enter your last name.');
      return;
    }

    updateFlowState({
      collectedData: { ...flowState.collectedData, lastName: input.trim() },
      step: 'firstName',
    });

    addMessage(
      'assistant',
      'Thank you! Now, please enter your first name.'
    );
  };

  const handleFirstNameStep = async (input: string) => {
    if (!input || input.trim().length === 0) {
      addMessage('assistant', 'Please enter your first name.');
      return;
    }

    const updatedData = {
      ...flowState.collectedData,
      firstName: input.trim(),
    };

    updateFlowState({
      collectedData: updatedData,
    });

    // After first name is entered, trigger name matching
    await checkNameMatch(updatedData);
  };

  const checkNameMatch = async (data: CollectedSignupData) => {
    if (!data.firstName || !data.lastName) {
      // Not enough data yet, continue to middle name
      addMessage(
        'assistant',
        'Got it! Please enter your middle name or middle initial (optional - you can type "skip" if you don\'t have one).'
      );
      updateFlowState({ step: 'middleName' });
      return;
    }

    // Search for matches in hierarchy
    const matches = matchNameInHierarchy(
      data.firstName,
      data.lastName,
      data.middleName
    );

    if (matches.length === 0) {
      // No match found, continue to middle name if not provided
      if (!data.middleName) {
        addMessage(
          'assistant',
          'I couldn\'t find an exact match. Please enter your middle name or middle initial (optional - you can type "skip" if you don\'t have one).'
        );
        updateFlowState({ step: 'middleName' });
      } else {
        // Already tried with middle name, no match - continue to unit manager
        addMessage(
          'assistant',
          'I couldn\'t find a match in our system. That\'s okay! We\'ll continue with manual entry. Please enter your Unit Manager\'s name. You can enter just first and last name, or the full name.'
        );
        updateFlowState({ 
          step: 'unitManager',
          hierarchyMatch: null, // Explicitly no match
        });
      }
      return;
    }

    // Match found - show confirmation
    if (matches.length === 1) {
      // Single exact match
      const match = matches[0];
      updateFlowState({
        hierarchyMatch: match,
        pendingConfirmation: {
          type: 'hierarchy',
          data: match,
        },
      });

      const confirmationMessage = `I found a match! Is this you?

👤 **Full Name:** ${formatDisplayName(match.name)}
🏢 **Agency:** ${match.agencyName}
👥 **Unit Manager:** ${match.unitManager ? formatDisplayName(match.unitManager) : 'None (Top Level)'}
📊 **Rank:** ${match.rank}

Please type "yes" if this is correct, or "no" if this is not you.`;

      addMessage('assistant', confirmationMessage);
      updateFlowState({ step: 'confirm' });
    } else {
      // Multiple matches - show list
      let matchList = 'I found multiple matches. Please select which one is you:\n\n';
      matches.slice(0, 5).forEach((match, index) => {
        matchList += `${index + 1}. ${formatDisplayName(match.name)} - ${match.agencyName} (${match.rank})\n`;
      });
      matchList += '\nPlease type the number (1-5) of the correct match, or "none" if none of these are you.';

      addMessage('assistant', matchList);
      updateFlowState({
        pendingConfirmation: {
          type: 'hierarchy',
          data: matches,
        },
        step: 'confirm',
      });
    }
  };

  const handleMiddleNameStep = async (input: string) => {
    const trimmedInput = input.trim().toLowerCase();
    
    // Allow user to skip middle name
    if (trimmedInput === 'skip' || trimmedInput === '' || trimmedInput === 'none') {
      const updatedData = {
        ...flowState.collectedData,
        middleName: undefined,
      };
      updateFlowState({
        collectedData: updatedData,
      });
      
      // Try matching again without middle name
      await checkNameMatch(updatedData);
      return;
    }

    const updatedData = {
      ...flowState.collectedData,
      middleName: input.trim(),
    };
    updateFlowState({
      collectedData: updatedData,
    });

    // Try matching again with middle name
    await checkNameMatch(updatedData);
  };

  const handleUnitManagerStep = async (input: string) => {
    if (!input || input.trim().length === 0) {
      addMessage('assistant', 'Please enter your Unit Manager\'s name.');
      return;
    }

    const inputTrimmed = input.trim();
    
    // Try to parse if it's just first and last name
    const nameParts = inputTrimmed.split(/\s+/);
    
    if (nameParts.length >= 2) {
      // Assume first name and last name
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      
      // Search for unit manager matches
      const umMatches = matchUnitManagerName(firstName, lastName);
      
      if (umMatches.length === 1) {
        // Single match found - confirm
        const match = umMatches[0];
        const confirmationMessage = `I found a match! Is this your Unit Manager?

👤 **Full Name:** ${formatDisplayName(match.name)}
🏢 **Agency:** ${match.agencyName}
📊 **Rank:** ${match.rank}

Please type "yes" to confirm, or "no" to enter a different name.`;

        addMessage('assistant', confirmationMessage);
        updateFlowState({
          pendingConfirmation: {
            type: 'unitManager',
            data: match,
          },
          step: 'confirm',
        });
        return;
      } else if (umMatches.length > 1) {
        // Multiple matches
        let matchList = 'I found multiple matches. Please select which one is your Unit Manager:\n\n';
        umMatches.slice(0, 5).forEach((match, index) => {
          matchList += `${index + 1}. ${formatDisplayName(match.name)} - ${match.agencyName} (${match.rank})\n`;
        });
        matchList += '\nPlease type the number (1-5) of the correct match, or "none" to enter manually.';

        addMessage('assistant', matchList);
        updateFlowState({
          pendingConfirmation: {
            type: 'unitManager',
            data: umMatches,
          },
          step: 'confirm',
        });
        return;
      }
    }

    // No match found or full name provided - check if it exists in hierarchy
    const allUnitManagers = new Set<string>();
    for (const entry of HARDCODED_HIERARCHY_DATA) {
      if (entry.unitManager) {
        allUnitManagers.add(normalizeNameForMatching(entry.unitManager));
      }
      if (entry.rank === 'UM' || entry.rank === 'SUM' || entry.rank === 'ADD') {
        allUnitManagers.add(normalizeNameForMatching(entry.name));
      }
    }

    const normalizedInput = normalizeNameForMatching(inputTrimmed);
    const existsInHierarchy = Array.from(allUnitManagers).some(um => 
      normalizeNameForMatching(um) === normalizedInput
    );

    if (!existsInHierarchy) {
      // Not found in hierarchy - ask to confirm saving as "Others"
      addMessage(
        'assistant',
        `I couldn't find "${formatDisplayName(inputTrimmed)}" in our system. Would you like to save this Unit Manager as "Others"? (Type "yes" to confirm, or "no" to enter a different name)`
      );
      updateFlowState({
        pendingConfirmation: {
          type: 'unitManager',
          data: { name: inputTrimmed, saveAsOthers: true },
        },
        step: 'confirm',
      });
      return;
    }

    // Found in hierarchy - use it
    updateFlowState({
      collectedData: { ...flowState.collectedData, unitManager: inputTrimmed },
      step: 'agency',
    });

    addMessage(
      'assistant',
      'Perfect! Now, please enter your Agency name.'
    );
  };

  const handleAgencyStep = async (input: string) => {
    if (!input || input.trim().length === 0) {
      addMessage('assistant', 'Please enter your Agency name.');
      return;
    }

    const inputTrimmed = input.trim();
    
    // Check if agency exists in hierarchy
    const agencyExists = checkAgencyExists(inputTrimmed);
    
    if (!agencyExists) {
      // Agency not found - ask to confirm saving as "Other"
      addMessage(
        'assistant',
        `I couldn't find "${inputTrimmed}" in our system. Would you like to save this Agency as "Other"? (Type "yes" to confirm, or "no" to enter a different agency name)`
      );
      updateFlowState({
        pendingConfirmation: {
          type: 'agency',
          data: { name: inputTrimmed, saveAsOther: true },
        },
        step: 'confirm',
      });
      return;
    }

    // Agency exists - use it
    updateFlowState({
      collectedData: { ...flowState.collectedData, agency: inputTrimmed },
      step: 'password',
    });

    addMessage(
      'assistant',
      'Great! Now, please create a password for your account (minimum 6 characters).'
    );
  };

  const handlePasswordStep = async (input: string) => {
    if (!input || input.length < 6) {
      addMessage(
        'assistant',
        'Password must be at least 6 characters long. Please enter a stronger password.'
      );
      return;
    }

    updateFlowState({
      collectedData: { ...flowState.collectedData, password: input },
      step: 'confirm',
    });

    // Show summary for confirmation
    const summary = buildSummaryMessage(flowState.collectedData);
    addMessage('assistant', summary);
    addMessage(
      'assistant',
      'Please review the information above. Type "confirm" to create your account, or "edit" to make changes.'
    );
  };

  const handleConfirmStep = async (input: string) => {
    const trimmedInput = input.trim().toLowerCase();
    const pendingConf = flowState.pendingConfirmation;

    if (!pendingConf) {
      // No pending confirmation - this is final confirmation
      if (trimmedInput === 'confirm' || trimmedInput === 'yes' || trimmedInput === 'y') {
        // Phase 4: Account creation
        await createAccount();
        return;
      } else if (trimmedInput === 'edit' || trimmedInput === 'change' || trimmedInput === 'no') {
        addMessage(
          'assistant',
          'Which field would you like to edit? (email, code, name, unit manager, agency, or password)'
        );
        // Edit flow will be implemented later
        return;
      } else {
        addMessage(
          'assistant',
          'Please type "confirm" to create your account, or "edit" to make changes.'
        );
        return;
      }
    }

    // Handle pending confirmations
    if (pendingConf.type === 'hierarchy') {
      // Hierarchy match confirmation
      if (trimmedInput === 'yes' || trimmedInput === 'y' || /^\d+$/.test(trimmedInput)) {
        let selectedMatch: OrganizationalHierarchyEntry | null = null;

        if (/^\d+$/.test(trimmedInput)) {
          // User selected a number from multiple matches
          const matchIndex = parseInt(trimmedInput) - 1;
          if (Array.isArray(pendingConf.data) && pendingConf.data[matchIndex]) {
            selectedMatch = pendingConf.data[matchIndex];
          } else {
            addMessage('assistant', 'Invalid selection. Please try again.');
            return;
          }
        } else {
          // Single match confirmed
          selectedMatch = pendingConf.data as OrganizationalHierarchyEntry;
        }

        if (selectedMatch) {
          // Use matched data
          const updatedData = {
            ...flowState.collectedData,
            agency: selectedMatch.agencyName,
            unitManager: selectedMatch.unitManager,
          };
          
          updateFlowState({
            collectedData: updatedData,
            hierarchyMatch: selectedMatch,
            pendingConfirmation: undefined,
            step: 'password',
          });

          addMessage(
            'assistant',
            `Perfect! I've confirmed your information. Now, please create a password for your account (minimum 6 characters).`
          );
        }
      } else if (trimmedInput === 'no' || trimmedInput === 'n' || trimmedInput === 'none') {
        // Not a match - continue with manual entry
        updateFlowState({
          hierarchyMatch: null,
          pendingConfirmation: undefined,
          step: flowState.collectedData.middleName ? 'unitManager' : 'middleName',
        });

        if (!flowState.collectedData.middleName) {
          addMessage(
            'assistant',
            'No problem! Please enter your middle name or middle initial (optional - you can type "skip" if you don\'t have one).'
          );
        } else {
          addMessage(
            'assistant',
            'No problem! Please enter your Unit Manager\'s name. You can enter just first and last name, or the full name.'
          );
        }
      } else {
        addMessage(
          'assistant',
          'Please type "yes" to confirm, "no" if this is not you, or a number if selecting from multiple matches.'
        );
      }
    } else if (pendingConf.type === 'unitManager') {
      // Unit manager confirmation
      if (trimmedInput === 'yes' || trimmedInput === 'y' || /^\d+$/.test(trimmedInput)) {
        let selectedUM: OrganizationalHierarchyEntry | string | null = null;

        if (/^\d+$/.test(trimmedInput)) {
          // User selected a number from multiple matches
          const matchIndex = parseInt(trimmedInput) - 1;
          if (Array.isArray(pendingConf.data) && pendingConf.data[matchIndex]) {
            selectedUM = pendingConf.data[matchIndex];
          } else {
            addMessage('assistant', 'Invalid selection. Please try again.');
            return;
          }
        } else if (pendingConf.data.saveAsOthers) {
          // User confirmed saving as "Others"
          selectedUM = 'Others';
        } else {
          // Single match confirmed
          selectedUM = pendingConf.data as OrganizationalHierarchyEntry;
        }

        const umName = typeof selectedUM === 'string' 
          ? selectedUM 
          : selectedUM.name;

        updateFlowState({
          collectedData: {
            ...flowState.collectedData,
            unitManager: umName,
            unitManagerFullName: typeof selectedUM === 'string' ? undefined : selectedUM.name,
          },
          unitManagerMatch: typeof selectedUM === 'string' ? null : selectedUM,
          pendingConfirmation: undefined,
          step: 'agency',
        });

        addMessage(
          'assistant',
          'Perfect! Now, please enter your Agency name.'
        );
      } else if (trimmedInput === 'no' || trimmedInput === 'n' || trimmedInput === 'none') {
        // Not correct - ask to re-enter
        updateFlowState({
          pendingConfirmation: undefined,
        });
        addMessage(
          'assistant',
          'No problem! Please enter your Unit Manager\'s name again. You can enter just first and last name, or the full name.'
        );
      } else {
        addMessage(
          'assistant',
          'Please type "yes" to confirm, "no" to enter a different name, or a number if selecting from multiple matches.'
        );
      }
    } else if (pendingConf.type === 'agency') {
      // Agency confirmation
      if (trimmedInput === 'yes' || trimmedInput === 'y') {
        // Save as "Other"
        const agencyName = pendingConf.data.name;
        updateFlowState({
          collectedData: {
            ...flowState.collectedData,
            agency: 'Other',
            agencyOther: agencyName,
          },
          agencyMatch: false,
          pendingConfirmation: undefined,
          step: 'password',
        });

        addMessage(
          'assistant',
          'Got it! I\'ve saved your agency as "Other". Now, please create a password for your account (minimum 6 characters).'
        );
      } else if (trimmedInput === 'no' || trimmedInput === 'n') {
        // Ask to re-enter
        updateFlowState({
          pendingConfirmation: undefined,
        });
        addMessage(
          'assistant',
          'No problem! Please enter your Agency name again.'
        );
      } else {
        addMessage(
          'assistant',
          'Please type "yes" to save as "Other", or "no" to enter a different agency name.'
        );
      }
    }
  };

  const createAccount = async () => {
    const data = flowState.collectedData;
    
    // Validate all required fields
    if (!data.email || !data.code || !data.firstName || !data.lastName || !data.password) {
      addMessage(
        'assistant',
        '❌ Error: Some required information is missing. Please start over or contact support.'
      );
      updateFlowState({ error: 'Missing required fields' });
      return;
    }

    // Determine role and rank from hierarchy match or defaults
    let role: 'advisor' | 'leader' = 'advisor';
    let rank: 'ADV' | 'AUM' | 'UM' | 'SUM' | 'ADD' = 'ADV';
    
    if (flowState.hierarchyMatch) {
      rank = flowState.hierarchyMatch.rank;
      role = rank === 'ADV' ? 'advisor' : 'leader';
    } else {
      // Default to advisor if no match
      role = 'advisor';
      rank = 'ADV';
    }

    // Build full name
    const fullName = getFullName(data);
    
    // Determine agency name
    const agencyName = data.agencyOther || data.agency || 'Other';
    
    // Determine unit manager
    let unitManager = data.unitManagerFullName || data.unitManager;
    
    // For leaders (UM, SUM, ADD), set unitManager to themselves
    if (role === 'leader' && (rank === 'UM' || rank === 'SUM' || rank === 'ADD')) {
      unitManager = fullName;
    }

    // Show processing message
    addMessage('assistant', '⏳ Creating your account... Please wait.');
    updateFlowState({ isLoading: true, error: undefined });

    try {
      // Create account using auth service
      const result = await registerUser(
        {
          email: data.email,
          code: data.code,
          name: fullName,
          role,
          rank,
          unitManager: unitManager || undefined,
          agencyName,
          password: data.password,
        },
        'system' // Created by system during signup
      );

      if (result.success && result.user) {
        // Success!
        addMessage(
          'assistant',
          `✅ **Account created successfully!**

Your account has been created. You can now log in with:
📧 Email: ${data.email}
🔑 Password: (the password you created)

You will be redirected to the login page shortly...`
        );
        
        updateFlowState({ 
          step: 'complete',
          isLoading: false,
        });

        // Call onComplete callback if provided
        if (onComplete) {
          onComplete(data);
        }

        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login?message=Account created successfully. Please log in.';
        }, 3000);
      } else {
        // Error creating account
        const errorMessage = result.error || 'Failed to create account. Please try again.';
        
        // Provide user-friendly error messages
        let friendlyMessage = errorMessage;
        if (errorMessage.includes('email-already-in-use') || errorMessage.includes('already exists')) {
          friendlyMessage = 'This email address is already registered. Please use a different email or try logging in.';
        } else if (errorMessage.includes('weak-password') || errorMessage.includes('password')) {
          friendlyMessage = 'Password is too weak. Please use a stronger password (at least 6 characters).';
        } else if (errorMessage.includes('invalid-email')) {
          friendlyMessage = 'Invalid email address. Please check and try again.';
        }
        
        addMessage(
          'assistant',
          `❌ **Error creating account**

${friendlyMessage}

Please try again or contact support if the problem persists.`
        );
        updateFlowState({ 
          error: friendlyMessage,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error creating account:', error);
      let errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('email-already-in-use') || errorMessage.includes('already exists')) {
        errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      addMessage(
        'assistant',
        `❌ **Error creating account**

${errorMessage}

Please try again or contact support.`
      );
      updateFlowState({ 
        error: errorMessage,
        isLoading: false,
      });
    }
  };

  const buildSummaryMessage = (data: CollectedSignupData): string => {
    const fullName = getFullName(data);

    let summary = `Here's a summary of your information:

📧 Email: ${data.email}
🔢 Code: ${data.code}
👤 Full Name: ${fullName}`;

    // Add rank and role if matched from hierarchy
    if (flowState.hierarchyMatch) {
      summary += `\n📊 Rank: ${flowState.hierarchyMatch.rank}`;
      summary += `\n👔 Role: ${flowState.hierarchyMatch.rank === 'ADV' ? 'Advisor' : 'Leader'}`;
    }

    summary += `\n👥 Unit Manager: ${data.unitManagerFullName ? formatDisplayName(data.unitManagerFullName) : (data.unitManager ? formatDisplayName(data.unitManager) : 'Not specified')}`;
    summary += `\n🏢 Agency: ${data.agencyOther ? `${data.agency} (${data.agencyOther})` : (data.agency || 'Not specified')}`;

    return summary;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserInput(input);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg shadow-lg border-2 border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#D31145] to-red-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">Signup Assistant</span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="hover:bg-white/20 rounded p-1 transition-colors"
            aria-label="Cancel"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-[#D31145] text-white'
                  : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-white/70' : 'text-slate-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white text-slate-800 border border-slate-200 rounded-lg p-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#D31145]" />
                <span className="text-xs text-slate-500 ml-2">Processing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Progress Indicator */}
      {flowState.step !== 'complete' && (
        <div className="px-4 pt-2 pb-1 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className={`flex-1 h-1.5 rounded-full ${
              ['email', 'code', 'lastName', 'firstName'].includes(flowState.step) 
                ? 'bg-[#D31145]' 
                : 'bg-slate-200'
            }`} />
            <div className={`flex-1 h-1.5 rounded-full ${
              ['middleName', 'unitManager', 'agency'].includes(flowState.step) 
                ? 'bg-[#D31145]' 
                : flowState.step === 'password' || flowState.step === 'confirm' || flowState.step === 'complete'
                ? 'bg-[#D31145]'
                : 'bg-slate-200'
            }`} />
            <div className={`flex-1 h-1.5 rounded-full ${
              ['password', 'confirm', 'complete'].includes(flowState.step) 
                ? 'bg-[#D31145]' 
                : 'bg-slate-200'
            }`} />
          </div>
          <p className="text-xs text-slate-500 mt-1 text-center">
            {flowState.step === 'email' && 'Step 1/3: Contact Info'}
            {flowState.step === 'code' && 'Step 1/3: Contact Info'}
            {flowState.step === 'lastName' && 'Step 1/3: Contact Info'}
            {flowState.step === 'firstName' && 'Step 1/3: Contact Info'}
            {flowState.step === 'middleName' && 'Step 2/3: Personal Details'}
            {flowState.step === 'unitManager' && 'Step 2/3: Personal Details'}
            {flowState.step === 'agency' && 'Step 2/3: Personal Details'}
            {flowState.step === 'password' && 'Step 3/3: Security'}
            {flowState.step === 'confirm' && 'Step 3/3: Review & Confirm'}
            {flowState.step === 'complete' && 'Complete!'}
          </p>
        </div>
      )}

      {/* Input */}
      {flowState.step !== 'complete' && (
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-lg">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type={flowState.step === 'password' ? 'password' : 'text'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                flowState.step === 'password' 
                  ? 'Enter your password (min 6 characters)...' 
                  : flowState.step === 'email'
                  ? 'your.email@example.com'
                  : 'Type your response...'
              }
              disabled={isProcessing || flowState.isLoading}
              className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:outline-none focus:ring-2 focus:ring-[#D31145]/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => handleUserInput(input)}
              disabled={!input.trim() || isProcessing || flowState.isLoading}
              className="bg-gradient-to-r from-[#D31145] to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(isProcessing || flowState.isLoading) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {flowState.error && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <span>⚠️</span>
              <span>{flowState.error}</span>
            </p>
          )}
        </div>
      )}

      {/* Success State */}
      {flowState.step === 'complete' && (
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-t border-green-200">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-1">Account Created Successfully!</h3>
              <p className="text-sm text-green-700">Redirecting to login page...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

