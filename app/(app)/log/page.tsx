'use client';

import { useState, Suspense, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SubstanceType, Batch } from '@/types';
import {
  DOSE_RANGES,
  validateDose,
  type Substance,
  type DoseWarning,
} from '@/lib/constants/dose-ranges';

function LogPageContent() {
  const searchParams = useSearchParams();
  const isCheckIn = searchParams.get('type') === 'checkin';
  const router = useRouter();
  const supabase = createClient();

  // Dose state
  const [substance, setSubstance] = useState<SubstanceType>('psilocybin');
  const [amount, setAmount] = useState('');
  const [batchId, setBatchId] = useState('');
  const [foodState, setFoodState] = useState<'empty' | 'light' | 'full'>('empty');
  const [intention, setIntention] = useState('');
  const [thresholdFeel, setThresholdFeel] = useState<'under' | 'sweetspot' | 'over' | null>(null);
  const [context, setContext] = useState<'work' | 'creative' | 'social' | 'physical' | 'rest' | null>(null);

  // Check-in state
  const [energy, setEnergy] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [stability, setStability] = useState(3);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<DoseWarning | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  // Fetch batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      const response = await fetch('/api/batches');
      const data = await response.json();
      if (data.batches) {
        setBatches(data.batches);
        // Auto-select active batch for current substance
        const activeBatch = data.batches.find(
          (b: Batch) => b.is_active && b.substance_type === substance
        );
        if (activeBatch) {
          setBatchId(activeBatch.id);
        }
      }
      setLoadingBatches(false);
    };
    fetchBatches();
  }, []);

  // Auto-reset amount and select appropriate batch when switching substances
  useEffect(() => {
    setAmount('');
    setWarning(null);
    // Select active batch for new substance
    const activeBatch = batches.find(
      (b) => b.is_active && b.substance_type === substance
    );
    setBatchId(activeBatch?.id || '');
  }, [substance, batches]);

  // Get current dose range for the selected substance
  const doseRange = DOSE_RANGES[substance as Substance];

  const handleDoseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Convert to grams for psilocybin (input is in mg)
    const rawAmount = parseFloat(amount);
    const normalizedAmount = substance === 'psilocybin' ? rawAmount / 1000 : rawAmount;

    // Validate dose
    const doseWarning = validateDose(substance as Substance, normalizedAmount);

    if (doseWarning) {
      if (!doseWarning.allowContinue) {
        // Critical warning - block submission
        setWarning(doseWarning);
        return;
      }
      if (!pendingSubmit) {
        // First attempt with warning - show modal for confirmation
        setWarning(doseWarning);
        setPendingSubmit(true);
        return;
      }
    }

    // Clear warning state and proceed
    setWarning(null);
    setPendingSubmit(false);
    setLoading(true);

    try {
      // Prepare dose data (store in grams)
      const doseData = {
        batch_id: batchId || 'default-batch',
        amount: normalizedAmount,
        food_state: foodState,
        intention: intention,
      };

      // Submit to API
      const response = await fetch('/api/doses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(doseData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to log dose');
      }

      // Success - redirect to compass
      router.push('/compass');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare check-in data
      const checkInData = {
        phase: 'active' as const, // TODO: Determine phase based on time since last dose
        conditions: {
          load: 'med' as const, // TODO: Add conditions form fields
          noise: 'med' as const,
          schedule: 'mixed' as const,
        },
        signals: {
          energy,
          clarity,
          stability,
        },
      };

      // Submit to API
      const response = await fetch('/api/check-ins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkInData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit check-in');
      }

      // Success - redirect to compass
      router.push('/compass');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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
            Typical: {substance === 'psilocybin'
              ? `${doseRange.typicalLow * 1000}-${doseRange.typicalHigh * 1000}mg`
              : `${doseRange.typicalLow}-${doseRange.typicalHigh}µg`}
            {' • '}Max: {substance === 'psilocybin'
              ? `${doseRange.max * 1000}mg`
              : `${doseRange.max}µg`}
          </p>
        </div>

        {/* Batch Selector */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="font-mono text-sm uppercase tracking-wide text-ivory/60">
              Batch
            </label>
            <Link href="/batch" className="text-orange text-xs hover:underline">
              + New Batch
            </Link>
          </div>
          {loadingBatches ? (
            <div className="w-full bg-charcoal border border-ivory/20 rounded-sm px-3 py-3 text-ivory/50">
              Loading batches...
            </div>
          ) : (
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full bg-charcoal border border-ivory/20 rounded-sm px-3 py-3 text-ivory focus:outline-none focus:border-orange"
            >
              <option value="">No batch selected</option>
              {batches
                .filter((b) => b.substance_type === substance && !b.archived_at)
                .map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} {batch.is_active ? '(Active)' : ''}
                  </option>
                ))}
            </select>
          )}
          <p className="text-ivory/40 text-xs mt-1">
            Batches track potency across doses from the same source
          </p>
        </div>

        {/* Food State */}
        <div>
          <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
            Food State
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFoodState('empty')}
              className={`py-3 rounded-sm font-mono uppercase text-sm ${
                foodState === 'empty'
                  ? 'bg-orange text-black'
                  : 'bg-charcoal border border-ivory/20 text-ivory/60'
              }`}
            >
              Empty
            </button>
            <button
              type="button"
              onClick={() => setFoodState('light')}
              className={`py-3 rounded-sm font-mono uppercase text-sm ${
                foodState === 'light'
                  ? 'bg-orange text-black'
                  : 'bg-charcoal border border-ivory/20 text-ivory/60'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setFoodState('full')}
              className={`py-3 rounded-sm font-mono uppercase text-sm ${
                foodState === 'full'
                  ? 'bg-orange text-black'
                  : 'bg-charcoal border border-ivory/20 text-ivory/60'
              }`}
            >
              Full
            </button>
          </div>
          <p className="text-ivory/40 text-xs mt-1">
            Food state affects absorption and onset time
          </p>
        </div>

        {/* Intention */}
        <div>
          <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-2">
            Intention
          </label>
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            className="w-full bg-charcoal border border-ivory/20 rounded-sm px-3 py-3 text-ivory placeholder:text-ivory/40 focus:outline-none focus:border-orange resize-none"
            placeholder="What's your intention for this dose?"
            rows={3}
            required
          />
        </div>

        {/* Context (Phase 2) */}
        <div>
          <label className="block font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
            Context <span className="text-ivory/40">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'work', emoji: '💼', label: 'Work' },
              { value: 'creative', emoji: '🎨', label: 'Creative' },
              { value: 'social', emoji: '👥', label: 'Social' },
              { value: 'physical', emoji: '🏃', label: 'Physical' },
              { value: 'rest', emoji: '🧘', label: 'Rest' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContext(context === opt.value as typeof context ? null : opt.value as typeof context)}
                className={`px-3 py-2 rounded-sm font-mono text-sm ${
                  context === opt.value
                    ? 'bg-violet text-black'
                    : 'bg-charcoal border border-ivory/20 text-ivory/60'
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
          <p className="text-ivory/40 text-xs mt-1">
            What will you be doing today? Helps track best contexts.
          </p>
        </div>

        {/* Threshold Feel (Post-Dose) */}
        <div className="bg-charcoal/30 border border-violet/20 rounded-sm p-4">
          <label className="block font-mono text-sm uppercase tracking-wide text-violet mb-3">
            How did this dose feel?
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setThresholdFeel(thresholdFeel === 'under' ? null : 'under')}
              className={`py-3 rounded-sm font-mono text-sm flex flex-col items-center gap-1 ${
                thresholdFeel === 'under'
                  ? 'bg-blue-500 text-black'
                  : 'bg-charcoal border border-ivory/20 text-ivory/60'
              }`}
            >
              <span className="text-lg">↓</span>
              <span>Under</span>
            </button>
            <button
              type="button"
              onClick={() => setThresholdFeel(thresholdFeel === 'sweetspot' ? null : 'sweetspot')}
              className={`py-3 rounded-sm font-mono text-sm flex flex-col items-center gap-1 ${
                thresholdFeel === 'sweetspot'
                  ? 'bg-green-500 text-black'
                  : 'bg-charcoal border border-ivory/20 text-ivory/60'
              }`}
            >
              <span className="text-lg">●</span>
              <span>Sweet Spot</span>
            </button>
            <button
              type="button"
              onClick={() => setThresholdFeel(thresholdFeel === 'over' ? null : 'over')}
              className={`py-3 rounded-sm font-mono text-sm flex flex-col items-center gap-1 ${
                thresholdFeel === 'over'
                  ? 'bg-red-500 text-black'
                  : 'bg-charcoal border border-ivory/20 text-ivory/60'
              }`}
            >
              <span className="text-lg">↑</span>
              <span>Over</span>
            </button>
          </div>
          <p className="text-ivory/40 text-xs mt-2 text-center">
            Optional — fill in later or skip if unsure
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-sm px-3 py-2 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Dose Warning Modal */}
        {warning && (
          <div className={`rounded-sm p-4 ${
            warning.level === 'critical'
              ? 'bg-red-900/30 border-2 border-red-500'
              : warning.level === 'warning'
              ? 'bg-yellow-900/30 border-2 border-yellow-500'
              : 'bg-blue-900/30 border border-blue-500/50'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {warning.level === 'critical' ? '🚫' : warning.level === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <div className="flex-1">
                <h3 className={`font-mono text-sm uppercase tracking-wide mb-1 ${
                  warning.level === 'critical'
                    ? 'text-red-400'
                    : warning.level === 'warning'
                    ? 'text-yellow-400'
                    : 'text-blue-400'
                }`}>
                  {warning.title}
                </h3>
                <p className="text-ivory/80 text-sm">{warning.message}</p>
                {warning.allowContinue && pendingSubmit && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setWarning(null);
                        setPendingSubmit(false);
                      }}
                      className="flex-1 py-2 text-sm border border-ivory/20 rounded-sm text-ivory/60 hover:bg-ivory/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 text-sm bg-yellow-600 text-black font-mono uppercase rounded-sm hover:bg-yellow-500"
                    >
                      Log Anyway
                    </button>
                  </div>
                )}
                {!warning.allowContinue && (
                  <button
                    type="button"
                    onClick={() => {
                      setWarning(null);
                      setAmount('');
                    }}
                    className="mt-3 w-full py-2 text-sm border border-red-500/50 rounded-sm text-red-400 hover:bg-red-500/10"
                  >
                    Understood — Clear Dose
                  </button>
                )}
              </div>
            </div>
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

        {(!warning || warning.allowContinue) && !pendingSubmit && (
          <button
            type="submit"
            disabled={loading || !amount || !intention}
            className="w-full bg-orange text-black font-mono uppercase tracking-wide py-4 rounded-sm hover:bg-orange/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging...' : 'Log Dose'}
          </button>
        )}
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
