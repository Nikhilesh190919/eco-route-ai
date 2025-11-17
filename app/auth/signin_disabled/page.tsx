"use client";
import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signinSchema } from '@/lib/validators';
import { z } from 'zod';

type FormData = z.infer<typeof signinSchema>;

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(signinSchema),
  });

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess(true);
    }
  }, [searchParams]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      const res = await signIn('credentials', { 
        email: data.email, 
        password: data.password, 
        redirect: false,
        callbackUrl,
      });
      
      if (res?.error) {
        setError('Invalid email or password');
      } else if (res?.ok) {
        // Session is created, refresh to ensure it persists
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-8 sm:py-12 w-full">
      <div className="card p-4 sm:p-6 space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sign in</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              {...register('email')}
              disabled={loading}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              {...register('password')}
              disabled={loading}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.password.message}</p>
            )}
          </div>
          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Account created successfully! Please sign in.</p>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
          <button type="submit" className="btn w-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
        <div className="text-sm text-center text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <a href="/auth/signup" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
            Sign up
          </a>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Tip: run db:seed and sign in as demo@ecoroute.ai / password123</div>
      </div>
    </div>
  );
}

