'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Batch, SubstanceType, CalibrationStatus } from '@/types';

const CALIBRATION_LABELS: Record<CalibrationStatus, { label: string; color: string }> = {
  uncalibrated: { label: 'New', color: 'text-ivory/50' },
  calibrating: { label: 'Learning', color: 'text-yellow-400' },
  calibrated: { label: 'Calibrated', color: 'text-green-400' },
};

export default function BatchPage() {
  const supabase = createClient();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [substance, setSubstance] = useState<SubstanceType>('psilocybin');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    const response = await fetch('/api/batches');
    const data = await response.json();
    if (data.batches) {
      setBatches(data.batches);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, substance_type: substance, notes, source }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error);
      setSaving(false);
      return;
    }

    // Reset form and refresh
    setName('');
    setNotes('');
    setSource('');
    setShowForm(false);
    setSaving(false);
    fetchBatches();
  };

  const toggleActive = async (batch: Batch) => {
    const response = await fetch('/api/batches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: batch.id, is_active: !batch.is_active }),
    });

    if (response.ok) {
      fetchBatches();
    }
  };

  const archiveBatch = async (batch: Batch) => {
    const response = await fetch('/api/batches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: batch.id,
        archived_at: new Date().toISOString(),
        is_active: false,
      }),
    });

    if (response.ok) {
      fetchBatches();
    }
  };

  const activeBatches = batches.filter(b => !b.archived_at);
  const archivedBatches = batches.filter(b => b.archived_at);

  return (
    <main className="min-h-screen bg-black text-ivory p-6 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <Link href="/compass" className="text-ivory/60 hover:text-ivory">
          ← Back
        </Link>
        <h1 className="font-mono text-xl uppercase tracking-wide">Batches</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-orange font-mono text-sm"
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </header>

      {/* New Batch Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 bg-charcoal border border-ivory/10 rounded-sm p-4 space-y-4">
          <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60">
            New Batch
          </h2>

          <div>
            <label className="block text-sm text-ivory/60 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-ivory/20 rounded-sm px-3 py-2 text-ivory focus:outline-none focus:border-orange"
              placeholder="e.g., Golden Teacher #3"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-ivory/60 mb-2">Substance</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSubstance('psilocybin')}
                className={`py-2 rounded-sm font-mono text-sm ${
                  substance === 'psilocybin'
                    ? 'bg-violet text-black'
                    : 'bg-black border border-ivory/20 text-ivory/60'
                }`}
              >
                Psilocybin
              </button>
              <button
                type="button"
                onClick={() => setSubstance('lsd')}
                className={`py-2 rounded-sm font-mono text-sm ${
                  substance === 'lsd'
                    ? 'bg-violet text-black'
                    : 'bg-black border border-ivory/20 text-ivory/60'
                }`}
              >
                LSD
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-ivory/60 mb-1">Source (optional)</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-black border border-ivory/20 rounded-sm px-3 py-2 text-ivory focus:outline-none focus:border-orange"
              placeholder="e.g., Home grown, Vendor name"
            />
          </div>

          <div>
            <label className="block text-sm text-ivory/60 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-black border border-ivory/20 rounded-sm px-3 py-2 text-ivory focus:outline-none focus:border-orange resize-none"
              placeholder="Any notes about this batch..."
              rows={2}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving || !name}
            className="w-full bg-orange text-black font-mono uppercase py-3 rounded-sm disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Batch'}
          </button>
        </form>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center text-ivory/50 py-8">Loading batches...</div>
      )}

      {/* Active Batches */}
      {!loading && (
        <section className="mb-8">
          <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
            Active Batches
          </h2>
          {activeBatches.length > 0 ? (
            <div className="space-y-3">
              {activeBatches.map((batch) => (
                <div
                  key={batch.id}
                  className={`bg-charcoal border rounded-sm p-4 ${
                    batch.is_active ? 'border-orange' : 'border-ivory/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-mono text-lg">{batch.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-ivory/50">
                        <span className="uppercase">{batch.substance_type}</span>
                        <span>•</span>
                        <span className={CALIBRATION_LABELS[batch.calibration_status].color}>
                          {CALIBRATION_LABELS[batch.calibration_status].label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {batch.is_active && (
                        <span className="text-xs bg-orange/20 text-orange px-2 py-1 rounded-sm font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-sm mb-3">
                    <div>
                      <span className="text-ivory/50">Doses: </span>
                      <span className="font-mono">{batch.doses_logged}</span>
                    </div>
                    {batch.potency_estimate && (
                      <div>
                        <span className="text-ivory/50">Potency: </span>
                        <span className="font-mono">{batch.potency_estimate.toFixed(1)}x</span>
                      </div>
                    )}
                  </div>

                  {batch.notes && (
                    <p className="text-ivory/40 text-sm mb-3">{batch.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(batch)}
                      className={`flex-1 py-2 text-sm rounded-sm font-mono ${
                        batch.is_active
                          ? 'border border-ivory/20 text-ivory/60'
                          : 'bg-violet text-black'
                      }`}
                    >
                      {batch.is_active ? 'Deactivate' : 'Set Active'}
                    </button>
                    <button
                      onClick={() => archiveBatch(batch)}
                      className="py-2 px-3 text-sm border border-red-500/30 text-red-400/80 rounded-sm"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-charcoal/50 border border-ivory/10 rounded-sm p-4 text-center">
              <p className="text-ivory/50 text-sm">No active batches</p>
              <p className="text-ivory/30 text-xs mt-1">Create a batch to track potency across doses</p>
            </div>
          )}
        </section>
      )}

      {/* Archived Batches */}
      {!loading && archivedBatches.length > 0 && (
        <section>
          <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/40 mb-3">
            Archived ({archivedBatches.length})
          </h2>
          <div className="space-y-2">
            {archivedBatches.map((batch) => (
              <div
                key={batch.id}
                className="bg-charcoal/30 border border-ivory/5 rounded-sm p-3 flex justify-between items-center"
              >
                <div>
                  <span className="text-ivory/50">{batch.name}</span>
                  <span className="text-ivory/30 text-sm ml-2">
                    ({batch.doses_logged} doses)
                  </span>
                </div>
                <span className="text-xs text-ivory/30 uppercase">{batch.substance_type}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-ivory/10 p-4 flex justify-around">
        <Link href="/compass" className="text-ivory/60 font-mono text-xs uppercase hover:text-ivory">
          Compass
        </Link>
        <Link href="/log" className="text-ivory/60 font-mono text-xs uppercase hover:text-ivory">
          Log
        </Link>
        <Link href="/insights" className="text-ivory/60 font-mono text-xs uppercase hover:text-ivory">
          Insights
        </Link>
        <Link href="/settings" className="text-ivory/60 font-mono text-xs uppercase hover:text-ivory">
          Settings
        </Link>
      </nav>
    </main>
  );
}
