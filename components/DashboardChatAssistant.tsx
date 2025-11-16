"use client";
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { planSchemaEnhanced } from '@/lib/validators';
import { RouteCard } from '@/components/RouteCard';
import { z } from 'zod';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import type { RouteOption } from '@/types/routes';

type FormData = z.infer<typeof planSchemaEnhanced>;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  routes?: RouteOption[];
  timestamp: Date;
};

const QUICK_PROMPTS = [
  {
    label: "What is an eco-score?",
    prompt: "Explain what eco-score means and how it's calculated",
  },
  {
    label: "Best budget option",
    prompt: "Suggest the most budget-friendly eco-travel options",
  },
  {
    label: "Lowest CO₂ routes",
    prompt: "What are the lowest CO₂ emission travel options?",
  },
];

export function DashboardChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m your eco-travel assistant. I can help you plan sustainable routes, find budget-friendly options, and explain eco-scores. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(planSchemaEnhanced),
    defaultValues: {
      origin: '',
      destination: '',
      budget: 100,
    },
  });

  const origin = watch('origin');
  const destination = watch('destination');
  const budget = watch('budget');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const addMessage = (role: 'user' | 'assistant', content: string, routes?: RouteOption[]) => {
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role,
      content,
      routes,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handlePlanRoute = async (data: FormData) => {
    const userMessage = `Plan a route from ${data.origin} to ${data.destination} with a budget of $${data.budget}`;
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({
          error: res.status === 503
            ? 'AI service temporarily unavailable. Please try again in a moment.'
            : res.status === 400
            ? 'Invalid input. Please check your entries.'
            : 'Failed to plan trip. Please try again.',
        }));
        throw new Error(errorData.error || 'Failed to plan trip');
      }

      const result = await res.json();
      if (!result.options || result.options.length === 0) {
        addMessage(
          'assistant',
          `I couldn't find any route options for ${data.origin} to ${data.destination} with your budget of $${data.budget}. Try different locations or increase your budget.`
        );
      } else {
        const opts = result.options ?? [];
        if (!Array.isArray(opts) || opts.length === 0) {
          addMessage(
            'assistant',
            'No route options found. Please try adjusting your budget or dates.',
            []
          );
        } else {
          const bestRoute = opts[0];
          const responseText = `I found ${opts.length} eco-friendly route option${opts.length > 1 ? 's' : ''} from ${data.origin} to ${data.destination}:\n\n` +
            `Best option: ${bestRoute.mode} (Eco-Score: ${typeof bestRoute.ecoScore === 'number' ? bestRoute.ecoScore : 'N/A'}, Cost: $${typeof bestRoute.cost === 'number' ? bestRoute.cost.toFixed(0) : 'N/A'}, CO₂: ${typeof bestRoute.co2Kg === 'number' ? bestRoute.co2Kg.toFixed(1) : 'N/A'}kg)`;
          
          addMessage('assistant', responseText, opts);
        }
      }

      reset();
    } catch (e: any) {
      const errorMessage = e.name === 'AbortError'
        ? 'Request timed out. Please try again with a smaller distance or check your connection.'
        : e.message || 'Failed to plan trip. Please check your connection and try again.';
      
      addMessage('assistant', `Sorry, I encountered an error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    addMessage('user', prompt);
    setIsLoading(true);

    // Simulate AI response for informational queries
    setTimeout(() => {
      let response = '';
      
      if (prompt.toLowerCase().includes('eco-score')) {
        response = `**Eco-Score Explained:**\n\nThe eco-score is a rating from 0-100 that measures how environmentally friendly a travel route is. Here's how it works:\n\n` +
          `• **70-100 (Green)**: Excellent - Very low CO₂ emissions, sustainable transport modes\n` +
          `• **40-69 (Yellow)**: Moderate - Acceptable emissions, some eco-friendly elements\n` +
          `• **0-39 (Red)**: Poor - High emissions, less sustainable options\n\n` +
          `The score considers:\n` +
          `- CO₂ emissions per kilometer\n` +
          `- Transport mode (train > bus > car > flight)\n` +
          `- Overall environmental impact\n\n` +
          `Choose routes with higher eco-scores to minimize your carbon footprint! 🌱`;
      } else if (prompt.toLowerCase().includes('budget')) {
        response = `**Budget-Friendly Eco-Travel Tips:**\n\n` +
          `1. **Buses**: Often the cheapest option with low CO₂ emissions\n` +
          `2. **Trains**: Slightly more expensive but very eco-friendly\n` +
          `3. **Carpooling**: Share costs while reducing emissions per person\n` +
          `4. **Book in advance**: Early bookings save money on trains and buses\n` +
          `5. **Off-peak travel**: Lower prices during non-peak hours\n\n` +
          `Want me to plan a specific route? Just tell me your origin, destination, and budget!`;
      } else if (prompt.toLowerCase().includes('co₂') || prompt.toLowerCase().includes('emission')) {
        response = `**Lowest CO₂ Travel Options (ranked):**\n\n` +
          `1. **Train** (0.041 kg CO₂/km) - Best choice! 🚆\n` +
          `2. **Bus** (0.089 kg CO₂/km) - Great budget option 🚌\n` +
          `3. **Ferry** (0.111 kg CO₂/km) - Good for water routes ⛴️\n` +
          `4. **Car** (0.171 kg CO₂/km) - Better with carpooling 🚗\n` +
          `5. **Flight** (0.255 kg CO₂/km) - Highest emissions, use sparingly ✈️\n\n` +
          `Tip: Combining modes (e.g., train+bus) can reduce overall emissions while staying flexible!`;
      } else {
        response = `I can help you with:\n\n` +
          `• Planning eco-friendly routes between cities\n` +
          `• Finding budget-friendly travel options\n` +
          `• Explaining eco-scores and CO₂ emissions\n` +
          `• Comparing different travel modes\n\n` +
          `Try asking me to plan a route or use one of the quick prompts below!`;
      }

      addMessage('assistant', response);
      setIsLoading(false);
    }, 1000);
  };

  const handleTextSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector('input[type="text"]') as HTMLInputElement;
    const query = input?.value.trim();
    
    if (!query) return;

    // Check if it looks like a route planning request
    if (query.toLowerCase().includes('from') && query.toLowerCase().includes('to')) {
      // Try to extract origin and destination
      const match = query.match(/from\s+([^,]+?)\s+to\s+([^,]+?)(?:\s+with\s+budget\s+of\s+\$?(\d+))?/i);
      if (match) {
        const [, origin, destination, budgetStr] = match;
        handlePlanRoute({
          origin: origin.trim(),
          destination: destination.trim(),
          budget: budgetStr ? parseInt(budgetStr) : 100,
        });
        input.value = '';
        return;
      }
    }

    // Otherwise, treat as informational query
    handleQuickPrompt(query);
    input.value = '';
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 bg-emerald-600 dark:bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 active:bg-emerald-800 dark:active:bg-emerald-700 transition-all hover:scale-110 flex items-center justify-center"
          aria-label="Open AI Assistant"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-full max-w-md h-[600px] max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-700 dark:to-green-700 px-4 py-3 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Eco Travel Assistant</h3>
                <p className="text-xs text-white/80">AI-powered route planning</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.routes && message.routes.length > 0 && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {message.routes.map((route, idx) => (
                            <RouteCard
                              key={idx}
                              mode={route.mode}
                              cost={route.cost}
                              durationMins={route.durationMins}
                              co2Kg={route.co2Kg}
                              ecoScore={route.ecoScore}
                              notes={route.notes}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(prompt.prompt)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Route Planning Form */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
                <form onSubmit={handleSubmit(handlePlanRoute)} className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      {...register('origin')}
                      placeholder="Origin"
                      disabled={isLoading}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    />
                    <input
                      {...register('destination')}
                      placeholder="Destination"
                      disabled={isLoading}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    />
                    <input
                      {...register('budget', { valueAsNumber: true })}
                      type="number"
                      placeholder="Budget $"
                      disabled={isLoading}
                      min="1"
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !origin || !destination}
                    className="w-full px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isLoading ? 'Planning...' : 'Plan Route'}
                  </button>
                  {errors.origin && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.origin.message}</p>
                  )}
                  {errors.destination && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.destination.message}</p>
                  )}
                  {errors.budget && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.budget.message}</p>
                  )}
                </form>
                <form onSubmit={handleTextSubmit} className="flex">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Or ask me anything..."
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

