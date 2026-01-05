'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ActivityPlanningData {
  newAdvisors?: number;
  clientsPerWeek?: number;
  jfwsPerWeek?: number;
  recruitmentInterviewsPerWeek?: number;
  // Mandatory meetings
  agencyAssembly?: { frequency: string; schedule: string };
  unitMeeting?: { frequency: string; schedule: string };
  businessReview?: { frequency: string; schedule: string };
  morningMeeting?: { frequency: string; schedule: string };
  aceSbsg?: { frequency: string; schedule: string };
}

interface ActivityPlanningChatProps {
  onComplete: (data: ActivityPlanningData) => void;
  onCancel: () => void;
}

export function ActivityPlanningChat({ onComplete, onCancel }: ActivityPlanningChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m here to help you create a personalized activity plan. Let\'s start by gathering some information about your activities.\n\nHow many new advisors are you currently working with?',
    },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [collectedData, setCollectedData] = useState<ActivityPlanningData>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const steps = [
    {
      key: 'newAdvisors',
      question: 'How many new advisors are you currently working with?',
      type: 'number',
    },
    {
      key: 'clientsPerWeek',
      question: 'How many clients do you target to meet every week?',
      type: 'number',
    },
    {
      key: 'jfwsPerWeek',
      question: 'How many Joint Field Works (JFWs) do you plan per week?',
      type: 'number',
    },
    {
      key: 'recruitmentInterviewsPerWeek',
      question: 'How many Recruitment Interviews or 1-on-1 BOPs (Business Opportunity Presentations) do you plan per week?',
      type: 'number',
    },
    {
      key: 'agencyAssembly',
      question: 'Agency Assembly: How often and when? (e.g., "Monthly, 2nd Thursday" or "Weekly, Friday 2pm")',
      type: 'text',
    },
    {
      key: 'unitMeeting',
      question: 'Unit Meeting: How often and when? (e.g., "Weekly, Monday 9am")',
      type: 'text',
    },
    {
      key: 'businessReview',
      question: 'Leaders Meeting: How often and when? (e.g., "Weekly, Monday 1-4pm")',
      type: 'text',
    },
    {
      key: 'morningMeeting',
      question: 'Morning Meeting: How often and when? (e.g., "Daily, 8am" or "Weekly, Tuesday 8am")',
      type: 'text',
    },
    {
      key: 'aceSbsg',
      question: 'ACE/SBSG: How often and when? (e.g., "Weekly, Wednesday 10am")',
      type: 'text',
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentStep]);

  const parseMeetingInput = (input: string): { frequency: string; schedule: string } => {
    // Simple parsing - can be enhanced
    const parts = input.split(',').map((p) => p.trim());
    return {
      frequency: parts[0] || input,
      schedule: parts.slice(1).join(', ') || '',
    };
  };

  const handleSend = () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentQuestion = steps[currentStep];
    let value: any = inputValue.trim();

    // Parse the value based on type
    if (currentQuestion.type === 'number') {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Please enter a valid number.',
          },
        ]);
        setInputValue('');
        return;
      }
      value = num;
    } else if (currentQuestion.key.includes('Assembly') || currentQuestion.key.includes('Meeting') || currentQuestion.key.includes('Review') || currentQuestion.key.includes('aceSbsg')) {
      value = parseMeetingInput(value);
    }

    // Store the collected data
    const newData = { ...collectedData, [currentQuestion.key]: value };
    setCollectedData(newData);

    // Move to next step
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: steps[nextStep].question,
        },
      ]);
    } else {
      // All questions answered, generate plan
      setIsGenerating(true);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Perfect! I have all the information I need. Generating your personalized activity plan...',
        },
      ]);
      // Call onComplete with all collected data
      setTimeout(() => {
        onComplete(newData);
      }, 500);
    }

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-xl border border-slate-200/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200/60 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-2 ring-white/20">
              <span className="text-white text-lg">✨</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">Activity Planning Assistant</h3>
              <p className="text-xs text-white/90 font-medium mt-0.5">Let's create your personalized plan</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white hover:text-white flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-white/90">Progress</span>
            <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-md">{currentStep + 1}/{steps.length}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-slate-50/50 to-white scroll-smooth">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0'
                  : 'bg-white text-slate-800 border border-slate-200/60 shadow-md'
              }`}
              style={{
                borderRadius: message.role === 'user' 
                  ? '1rem 1rem 0.25rem 1rem' 
                  : '1rem 1rem 1rem 0.25rem'
              }}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <span className="text-white text-[10px]">✨</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">Assistant</span>
                </div>
              )}
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                {message.content}
              </p>
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start transition-all duration-300">
            <div className="bg-white border border-slate-200/60 rounded-2xl px-4 py-3 shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span className="text-xs text-slate-500 ml-2 font-medium">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type={steps[currentStep]?.type === 'number' ? 'number' : 'text'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={steps[currentStep]?.type === 'number' ? 'Enter a number...' : 'Type your answer...'}
              disabled={isGenerating}
              className="w-full px-4 py-3 pr-12 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200 disabled:bg-slate-50 disabled:cursor-not-allowed placeholder:text-slate-400"
            />
            {steps[currentStep]?.type === 'number' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none">
                #
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center gap-2 min-w-[80px] justify-center active:scale-95"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </div>
        {steps[currentStep] && (
          <div className="mt-2.5 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              {steps[currentStep].type === 'number' && (
                <>
                  <span>💡</span>
                  <span>Tip: Enter a numeric value</span>
                </>
              )}
              {steps[currentStep].type === 'text' && (steps[currentStep].key.includes('Meeting') || steps[currentStep].key.includes('Assembly') || steps[currentStep].key.includes('aceSbsg')) && (
                <>
                  <span>💡</span>
                  <span>Tip: Format: &quot;Frequency, Schedule&quot; (e.g., &quot;Weekly, Monday 9am&quot;)</span>
                </>
              )}
            </p>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
