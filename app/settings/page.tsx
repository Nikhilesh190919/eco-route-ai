"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { settingsSchema, type SettingsInput } from '@/lib/validators';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useTheme } from '@/lib/useTheme';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { theme: currentTheme, setTheme: setCurrentTheme, resolvedTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      emailNotifications: true,
      theme: 'system',
    },
  });

  const emailNotifications = watch('emailNotifications');
  const theme = watch('theme');

  // Load existing preferences
  useEffect(() => {
    async function loadPreferences() {
      if (status === 'loading') return;
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/settings');
        if (!res.ok) {
          throw new Error('Failed to load settings');
        }
        const data = await res.json();
        const loadedTheme = data.theme ?? 'system';
        reset({
          emailNotifications: data.emailNotifications ?? true,
          theme: loadedTheme,
        });
        // Sync with localStorage and apply theme
        setCurrentTheme(loadedTheme);
      } catch (error) {
        console.error('Error loading preferences:', error);
        // Use defaults if loading fails
        setCurrentTheme('system');
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [session, status, reset, setCurrentTheme]);

  const onSubmit = async (data: SettingsInput) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to save settings');
      }

      // Apply theme immediately
      setCurrentTheme(data.theme);

      setSaveSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || 'An error occurred while saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-emerald-600 dark:border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to access settings.</p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 w-full">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Dashboard</span>
      </Link>

      {/* Settings Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-theme duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-theme duration-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customize your preferences</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 sm:p-8 space-y-6">
            {/* Success/Error Messages */}
            {saveSuccess && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 transition-theme duration-300">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Settings saved successfully!</p>
                </div>
              </div>
            )}

            {saveError && (
              <ErrorDisplay
                title="Failed to save settings"
                message={saveError}
                onRetry={() => setSaveError(null)}
              />
            )}

            {/* Notification Preferences */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notification Preferences</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-theme duration-300">
                    <div className="flex-1">
                      <label htmlFor="emailNotifications" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Email Notifications
                      </label>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Receive email updates about your trips and eco-friendly travel tips
                      </p>
                      {errors.emailNotifications && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.emailNotifications.message}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      id="emailNotifications"
                      {...register('emailNotifications')}
                      onClick={() => setValue('emailNotifications', !emailNotifications)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        emailNotifications ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={emailNotifications}
                      aria-label="Toggle email notifications"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          emailNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Mode */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4 transition-theme duration-300">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appearance</h2>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme Mode
                    {errors.theme && (
                      <span className="ml-2 text-xs text-red-600 dark:text-red-400">{errors.theme.message}</span>
                    )}
                  </label>
                  <input type="hidden" {...register('theme')} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setValue('theme', 'light')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        theme === 'light'
                          ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        theme === 'light' ? 'border-emerald-600 dark:border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {theme === 'light' && (
                          <div className="w-2.5 h-2.5 bg-emerald-600 dark:bg-emerald-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100">Light</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Always light</div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('theme', 'dark')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        theme === 'dark'
                          ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        theme === 'dark' ? 'border-emerald-600 dark:border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {theme === 'dark' && (
                          <div className="w-2.5 h-2.5 bg-emerald-600 dark:bg-emerald-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100">Dark</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Always dark</div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('theme', 'system')}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        theme === 'system'
                          ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        theme === 'system' ? 'border-emerald-600 dark:border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {theme === 'system' && (
                          <div className="w-2.5 h-2.5 bg-emerald-600 dark:bg-emerald-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100">System</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 transition-theme duration-300">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 active:bg-emerald-800 dark:active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <Link
                href="/dashboard"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Cancel</span>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

