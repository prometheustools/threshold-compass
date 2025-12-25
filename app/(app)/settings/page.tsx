'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { User, GuidanceLevel, NorthStarType, NotificationSettings, SensitivityProfile } from '@/types';

const NORTH_STAR_OPTIONS: { value: NorthStarType; label: string; description: string }[] = [
  { value: 'stability', label: 'Stability', description: 'Emotional regulation, grounding' },
  { value: 'clarity', label: 'Clarity', description: 'Mental sharpness, focus' },
  { value: 'creativity', label: 'Creativity', description: 'Divergent thinking, flow' },
  { value: 'presence', label: 'Presence', description: 'Awareness, mindfulness' },
  { value: 'recovery', label: 'Recovery', description: 'Healing, processing' },
  { value: 'exploration', label: 'Exploration', description: 'Discovery, openness' },
];

const GUIDANCE_OPTIONS: { value: GuidanceLevel; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Just the essentials' },
  { value: 'guided', label: 'Guided', description: 'Helpful prompts and tips' },
  { value: 'deep', label: 'Deep', description: 'Full explanations and context' },
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authCreatedAt, setAuthCreatedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Editable state
  const [northStar, setNorthStar] = useState<NorthStarType>('clarity');
  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel>('guided');
  const [notifications, setNotifications] = useState<NotificationSettings>({
    activationCheck: true,
    signalWindow: true,
    integration: true,
    endOfDay: true,
    followUp24h: false,
    followUp72h: false,
    method: 'push',
  });
  const [sensitivity, setSensitivity] = useState<SensitivityProfile>({
    caffeine: 3,
    cannabis: null,
    bodyAwareness: 3,
    emotionalReactivity: 3,
    medications: [],
  });
  const [newMedication, setNewMedication] = useState('');

  // Save status per section
  const [northStarStatus, setNorthStarStatus] = useState<SaveStatus>('idle');
  const [guidanceStatus, setGuidanceStatus] = useState<SaveStatus>('idle');
  const [notificationsStatus, setNotificationsStatus] = useState<SaveStatus>('idle');
  const [sensitivityStatus, setSensitivityStatus] = useState<SaveStatus>('idle');
  const [medicationsStatus, setMedicationsStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    // Get auth user for email/created_at
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      setAuthEmail(authUser.email || '');
      setAuthCreatedAt(authUser.created_at);
    }

    // Get user profile
    const response = await fetch('/api/users');
    const data = await response.json();
    if (data.user) {
      setUser(data.user);
      setNorthStar(data.user.north_star?.type || 'clarity');
      setGuidanceLevel(data.user.guidance_level || 'guided');
      setNotifications(data.user.notifications || notifications);
      setSensitivity(data.user.sensitivity || sensitivity);
    }
    setLoading(false);
  };

  const saveSection = async (
    section: string,
    data: Record<string, unknown>,
    setStatus: (s: SaveStatus) => void
  ) => {
    setStatus('saving');
    const response = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
    }
  };

  const handleNorthStarChange = (value: NorthStarType) => {
    setNorthStar(value);
    saveSection('north_star', { north_star: { type: value, custom: null } }, setNorthStarStatus);
  };

  const handleGuidanceChange = (value: GuidanceLevel) => {
    setGuidanceLevel(value);
    saveSection('guidance_level', { guidance_level: value }, setGuidanceStatus);
  };

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);
    saveSection('notifications', { notifications: { [key]: newNotifications[key] } }, setNotificationsStatus);
  };

  const handleSensitivityChange = (key: keyof SensitivityProfile, value: number) => {
    const newSensitivity = { ...sensitivity, [key]: value };
    setSensitivity(newSensitivity);
    saveSection('sensitivity', { sensitivity: { [key]: value } }, setSensitivityStatus);
  };

  const addMedication = () => {
    if (!newMedication.trim()) return;
    const updated = [...(sensitivity.medications || []), newMedication.trim()];
    setSensitivity({ ...sensitivity, medications: updated });
    setNewMedication('');
    saveSection('sensitivity', { sensitivity: { medications: updated } }, setMedicationsStatus);
  };

  const removeMedication = (index: number) => {
    const updated = sensitivity.medications.filter((_, i) => i !== index);
    setSensitivity({ ...sensitivity, medications: updated });
    saveSection('sensitivity', { sensitivity: { medications: updated } }, setMedicationsStatus);
  };

  const StatusBadge = ({ status }: { status: SaveStatus }) => {
    if (status === 'saving') return <span className="text-xs text-yellow-400">Saving...</span>;
    if (status === 'saved') return <span className="text-xs text-green-400">✓ Saved</span>;
    if (status === 'error') return <span className="text-xs text-red-400">Error</span>;
    return null;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-ivory/60 font-mono">Loading settings...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-ivory p-6 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <Link href="/compass" className="text-ivory/60 hover:text-ivory">
          ← Back
        </Link>
        <h1 className="font-mono text-xl uppercase tracking-wide">Settings</h1>
        <div className="w-10" />
      </header>

      {/* Account Section */}
      <section className="mb-8">
        <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
          Account
        </h2>
        <div className="bg-charcoal border border-ivory/10 rounded-sm p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-ivory/80">Email</span>
            <span className="text-ivory/50 text-sm">{authEmail}</span>
          </div>
          <div className="border-t border-ivory/10 pt-4 flex justify-between items-center">
            <span className="text-ivory/80">Member since</span>
            <span className="text-ivory/50 text-sm">
              {authCreatedAt && new Date(authCreatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </section>

      {/* North Star Section */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60">
            Your North Star
          </h2>
          <StatusBadge status={northStarStatus} />
        </div>
        <div className="bg-charcoal border border-ivory/10 rounded-sm p-4">
          <p className="text-ivory/50 text-sm mb-4">
            What direction guides your practice?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {NORTH_STAR_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleNorthStarChange(option.value)}
                className={`p-3 rounded-sm border text-left transition-colors ${
                  northStar === option.value
                    ? 'border-orange bg-orange/10 text-orange'
                    : 'border-ivory/10 hover:border-ivory/30'
                }`}
              >
                <div className="font-mono text-sm">{option.label}</div>
                <div className="text-xs text-ivory/40 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Guidance Level Section */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60">
            Guidance Level
          </h2>
          <StatusBadge status={guidanceStatus} />
        </div>
        <div className="bg-charcoal border border-ivory/10 rounded-sm p-4">
          <div className="space-y-2">
            {GUIDANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleGuidanceChange(option.value)}
                className={`w-full p-3 rounded-sm border transition-colors text-left ${
                  guidanceLevel === option.value
                    ? 'border-violet bg-violet/10'
                    : 'border-ivory/10 hover:border-ivory/30'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">{option.label}</span>
                  {guidanceLevel === option.value && (
                    <span className="text-violet text-xs">Active</span>
                  )}
                </div>
                <div className="text-xs text-ivory/40 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60">
            Notifications
          </h2>
          <StatusBadge status={notificationsStatus} />
        </div>
        <div className="bg-charcoal border border-ivory/10 rounded-sm p-4 space-y-3">
          {[
            { key: 'activationCheck' as const, label: 'Activation check (+45 min)', description: 'Prompt to notice early effects' },
            { key: 'signalWindow' as const, label: 'Signal window (+90 min)', description: 'Prime time for check-in' },
            { key: 'integration' as const, label: 'Integration (+3-4 hours)', description: 'End of active window' },
            { key: 'endOfDay' as const, label: 'End of day reflection', description: 'Daily practice review' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <div className="text-sm">{item.label}</div>
                <div className="text-xs text-ivory/40">{item.description}</div>
              </div>
              <button
                onClick={() => handleNotificationToggle(item.key)}
                className={`w-10 h-6 rounded-full p-1 transition-colors ${
                  notifications[item.key] ? 'bg-orange' : 'bg-ivory/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    notifications[item.key] ? 'translate-x-4' : ''
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Sensitivity Section */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60">
            Sensitivity Profile
          </h2>
          <StatusBadge status={sensitivityStatus} />
        </div>
        <div className="bg-charcoal border border-ivory/10 rounded-sm p-4 space-y-4">
          {[
            { key: 'caffeine' as const, label: 'Caffeine sensitivity' },
            { key: 'bodyAwareness' as const, label: 'Body awareness' },
            { key: 'emotionalReactivity' as const, label: 'Emotional reactivity' },
          ].map((item) => (
            <div key={item.key}>
              <div className="flex justify-between mb-1">
                <span className="text-sm">{item.label}</span>
                <span className="text-ivory/50 text-sm">{sensitivity[item.key] || 3}/5</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSensitivityChange(item.key, n)}
                    className={`flex-1 h-2 rounded-sm transition-colors ${
                      n <= (sensitivity[item.key] || 3) ? 'bg-violet' : 'bg-ivory/10'
                    } hover:opacity-80`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Medications Section */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60">
            Medications
          </h2>
          <StatusBadge status={medicationsStatus} />
        </div>
        <div className="bg-charcoal border border-ivory/10 rounded-sm p-4">
          <p className="text-ivory/50 text-sm mb-3">
            SSRIs and other medications can affect your experience. We'll warn you about interactions.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMedication()}
              className="flex-1 bg-black border border-ivory/20 rounded-sm px-3 py-2 text-ivory text-sm focus:outline-none focus:border-orange"
              placeholder="e.g., Sertraline 50mg"
            />
            <button
              onClick={addMedication}
              className="px-3 py-2 bg-violet text-black font-mono text-sm rounded-sm"
            >
              Add
            </button>
          </div>
          {sensitivity.medications && sensitivity.medications.length > 0 ? (
            <div className="space-y-2">
              {sensitivity.medications.map((med, i) => (
                <div key={i} className="flex justify-between items-center bg-black/30 px-3 py-2 rounded-sm">
                  <span className="text-sm">{med}</span>
                  <button
                    onClick={() => removeMedication(i)}
                    className="text-red-400/60 hover:text-red-400 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ivory/30 text-xs text-center py-2">No medications added</p>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="mb-8">
        <h2 className="font-mono text-sm uppercase tracking-wide text-red-400/60 mb-3">
          Danger Zone
        </h2>
        <div className="bg-charcoal border border-red-400/20 rounded-sm p-4 space-y-3">
          <button className="w-full py-2 text-sm border border-ivory/20 rounded-sm text-ivory/60 hover:bg-ivory/5">
            Export My Data
          </button>
          <button className="w-full py-2 text-sm border border-red-400/30 rounded-sm text-red-400/80 hover:bg-red-400/5">
            Delete Account
          </button>
        </div>
      </section>

      {/* Version Info */}
      <div className="text-center text-ivory/30 text-xs mb-8">
        <p>Threshold Compass v0.2.0</p>
        <p className="mt-1">Built with intention</p>
      </div>

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
        <Link href="/settings" className="text-orange font-mono text-xs uppercase">
          Settings
        </Link>
      </nav>
    </main>
  );
}
