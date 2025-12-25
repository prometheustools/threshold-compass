'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/onboarding');
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-mono text-2xl uppercase tracking-wide text-ivory">
            Create Account
          </h1>
          <p className="text-ivory/60 mt-2 text-sm">
            Begin your precision microdosing journey
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-mono text-ivory/80 mb-1">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-charcoal border border-ivory/20 rounded-sm px-3 py-3 text-ivory placeholder:text-ivory/40 focus:outline-none focus:border-orange"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-mono text-ivory/80 mb-1">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-charcoal border border-ivory/20 rounded-sm px-3 py-3 text-ivory placeholder:text-ivory/40 focus:outline-none focus:border-orange"
              placeholder="Min 8 characters"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-mono text-ivory/80 mb-1">
              CONFIRM PASSWORD
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-charcoal border border-ivory/20 rounded-sm px-3 py-3 text-ivory placeholder:text-ivory/40 focus:outline-none focus:border-orange"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-sm px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange text-black font-mono uppercase tracking-wide py-3 rounded-sm hover:bg-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-ivory/60 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-orange hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-ivory/40 text-xs mt-4 px-4">
          By creating an account, you acknowledge that this is an educational tool,
          not medical advice.
        </p>
      </div>
    </main>
  );
}
