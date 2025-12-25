'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SubstanceType } from '@/types';

function LogPageContent() {
  const searchParams = useSearchParams();
  const isCheckIn = searchParams.get('type') === 'checkin';
  const router = useRouter();
  const supabase = createClient();

  // Dose state
  const [substance, setSubstance] = useState<SubstanceType>('psilocybin');
  const [amount, setAmount] = useState('');
  const [batchId, setBatchId] = useState('');

  // Check-in state
  const [energy, setEnergy] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [stability, setStability] = useState(3);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDoseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // TODO: Calculate carryover using algorithm
    // TODO: Save to Supabase

    // For now, simulate success
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    router.push('/compass');
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // TODO: Save check-in to Supabase

    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    router.push('/compass');
  };

  if (isCheckIn) {
    return (
      <main className="min-h-screen bg-black text-ivory p-6">
        <header className="flex justify-between items-center mb-8">
          <Link href="/compass" className="text-ivory/60 hover:text-ivory">
            ← Back
          </Link>
          <h1 className="font-mono text-xl uppercase tracking-wide">Check In</h1>
          <div className="w-10" />
        </header>

        <form onSubmit={handleCheckInSubmit} className="space-y-6">
          {/* Energy */}
          <div>
            <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
              Energy Level
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergy(n)}
                  className={`flex-1 py-3 rounded-sm font-mono ${
                    energy === n
                      ? 'bg-orange text-black'
                      : 'bg-charcoal border border-ivory/20 text-ivory/60'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-ivory/40 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Clarity */}
          <div>
            <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
              Mental Clarity
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setClarity(n)}
                  className={`flex-1 py-3 rounded-sm font-mono ${
                    clarity === n
                      ? 'bg-violet text-black'
                      : 'bg-charcoal border border-ivory/20 text-ivory/60'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-ivory/40 mt-1">
              <span>Foggy</span>
              <span>Sharp</span>
            </div>
          </div>

          {/* Stability */}
          <div>
            <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
              Emotional Stability
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStability(n)}
                  className={`flex-1 py-3 rounded-sm font-mono ${
                    stability === n
                      ? 'bg-green-500 text-black'
                      : 'bg-charcoal border border-ivory/20 text-ivory/60'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-ivory/40 mt-1">
              <span>Turbulent</span>
              <span>Steady</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-sm px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange text-black font-mono uppercase tracking-wide py-4 rounded-sm hover:bg-orange/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Submit Check-In'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-ivory p-6">
      <header className="flex justify-between items-center mb-8">
        <Link href="/compass" className="text-ivory/60 hover:text-ivory">
          ← Back
        </Link>
        <h1 className="font-mono text-xl uppercase tracking-wide">Log Dose</h1>
        <div className="w-10" />
      </header>

      <form onSubmit={handleDoseSubmit} className="space-y-6">
        {/* Substance */}
        <div>
          <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
            Substance
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSubstance('psilocybin')}
              className={`py-3 rounded-sm font-mono uppercase ${
                substance === 'psilocybin'
                  ? 'bg-violet text-black'
                  : 'bg-charcoal border border-ivory/20 text-ivory/60'
              }`}
            >
              Psilocybin
            </button>
            <button
              type="button"
              onClick={() => setSubstance('lsd')}
              className={`py-3 rounded-sm font-mono uppercase ${
                substance === 'lsd'
                  ? 'bg-violet text-black'
                  : 'bg-charcoal border border-ivory/20 text-ivory/60'
              }`}
            >
              LSD
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-2">
            Amount ({substance === 'psilocybin' ? 'mg' : 'μg'})
          </label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-charcoal border border-ivory/20 rounded-sm px-3 py-3 text-ivory placeholder:text-ivory/40 focus:outline-none focus:border-orange text-lg font-mono"
            placeholder={substance === 'psilocybin' ? '100' : '10'}
            required
          />
          <p className="text-ivory/40 text-xs mt-1">
            {substance === 'psilocybin'
              ? 'Typical microdose: 50-200mg'
              : 'Typical microdose: 5-20μg'}
          </p>
        </div>

        {/* Batch (optional) */}
        <div>
          <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-2">
            Batch ID <span className="text-ivory/40">(optional)</span>
          </label>
          <input
            type="text"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="w-full bg-charcoal border border-ivory/20 rounded-sm px-3 py-3 text-ivory placeholder:text-ivory/40 focus:outline-none focus:border-orange"
            placeholder="e.g., APE-001"
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-sm px-3 py-2 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Carryover Preview */}
        <div className="bg-charcoal/50 border border-ivory/10 rounded-sm p-4">
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm text-ivory/60">Effective dose</span>
            <span className="font-mono text-lg">
              {amount || '0'} {substance === 'psilocybin' ? 'mg' : 'μg'}
            </span>
          </div>
          <p className="text-ivory/40 text-xs mt-2">
            Carryover will be calculated based on recent dosing history.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !amount}
          className="w-full bg-orange text-black font-mono uppercase tracking-wide py-4 rounded-sm hover:bg-orange/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Logging...' : 'Log Dose'}
        </button>
      </form>

      {/* Quick check-in link */}
      <p className="text-center text-ivory/60 text-sm mt-6">
        Already dosed?{' '}
        <Link href="/log?type=checkin" className="text-orange hover:underline">
          Just check in
        </Link>
      </p>
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-ivory/60 font-mono">Loading...</div>
    </main>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LogPageContent />
    </Suspense>
  );
}
