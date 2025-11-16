"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signupSchema } from '@/lib/validators';
import { z } from 'zod';

type FormData = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(result.error || 'User with this email already exists');
        }
        if (result.error && typeof result.error === 'object') {
          // Handle field-specific errors
          const fieldErrors = Object.values(result.error).flat();
          throw new Error(fieldErrors[0] as string || 'Validation failed');
        }
        throw new Error(result.error || 'Failed to create account');
      }

      // Success - redirect to sign in
      router.push('/auth/signin?registered=true');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-8 sm:py-12">
      <div className="card p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Sign up</h1>
          <p className="text-sm text-gray-600 mt-1">Create an account to start planning sustainable trips</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name (optional)</label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              {...register('name')}
              disabled={loading}
              placeholder="Your name"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              {...register('email')}
              disabled={loading}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              {...register('password')}
              disabled={loading}
              placeholder="At least 8 characters"
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}
          <button type="submit" className="btn w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
            ) : (
              'Sign up'
            )}
          </button>
        </form>
        <div className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <a href="/auth/signin" className="text-primary hover:underline font-medium">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

