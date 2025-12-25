import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { calculateCarryover } from '@/lib/algorithms/carryover';
import type { DoseLog, User, CarryoverTier } from '@/types';

// Tier colors
const TIER_COLORS: Record<CarryoverTier, string> = {
  clear: 'text-green-400',
  mild: 'text-yellow-400',
  moderate: 'text-orange',
  high: 'text-red-400',
};

export default async function CompassPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  // Fetch recent doses (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: recentDoses } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('user_id', authUser.id)
    .gte('timestamp', fourteenDaysAgo.toISOString())
    .order('timestamp', { ascending: false });

  // Calculate carryover (with defaults if no user profile yet)
  const defaultUser: User = {
    id: authUser.id,
    email: authUser.email || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    onboarding_complete: false,
    guidance_level: 'guided',
    default_logging_tier: 2,
    sensitivity: {
      caffeine: 3,
      cannabis: null,
      bodyAwareness: 3,
      emotionalReactivity: 3,
      medications: [],
    },
    primary_substance: 'psilocybin',
    notifications: {
      activationCheck: true,
      signalWindow: true,
      integration: true,
      endOfDay: true,
      followUp24h: false,
      followUp72h: false,
      method: 'push',
    },
    sharing_level: 'local',
    menstrual_tracking: false,
    cycle_day: null,
    emergency_contact: null,
    north_star: { type: 'clarity', custom: null },
  };

  const carryover = calculateCarryover(
    (recentDoses as DoseLog[]) || [],
    (userProfile as User) || defaultUser
  );

  // Get latest dose for display
  const latestDose = recentDoses?.[0] as DoseLog | undefined;

  return (
    <main className="min-h-screen bg-black text-ivory p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="font-mono text-xl uppercase tracking-wide">Compass</h1>
        <Link
          href="/drift"
          className="bg-violet/20 border border-violet/50 px-3 py-1 rounded-sm text-violet text-sm font-mono hover:bg-violet/30 transition-colors"
        >
          DRIFT
        </Link>
      </header>

      {/* Carryover Status */}
      <section className="mb-8">
        <div className="bg-charcoal border border-ivory/10 rounded-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-sm text-ivory/60 uppercase tracking-wide">
              Carryover
            </span>
            <span className={`text-2xl font-mono uppercase ${TIER_COLORS[carryover.tier]}`}>
              {carryover.tier}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 bg-ivory/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${carryover.tier === 'clear' ? 'bg-green-400' : carryover.tier === 'mild' ? 'bg-yellow-400' : carryover.tier === 'moderate' ? 'bg-orange' : 'bg-red-400'}`}
                style={{ width: `${carryover.score}%` }}
              />
            </div>
            <span className="font-mono text-sm text-ivory/60">{carryover.score}%</span>
          </div>
          <p className="text-ivory/50 text-sm">
            {carryover.recommendation}
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href="/log"
          className="bg-orange text-black font-mono uppercase tracking-wide py-4 rounded-sm text-center hover:bg-orange/90 transition-colors"
        >
          Log Dose
        </Link>
        <Link
          href="/log?type=checkin"
          className="bg-charcoal border border-ivory/20 font-mono uppercase tracking-wide py-4 rounded-sm text-center text-ivory hover:bg-charcoal/80 transition-colors"
        >
          Check In
        </Link>
      </section>

      {/* Course Correction */}
      <section className="mb-8">
        <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
          Course Correction
        </h2>
        <div className="bg-charcoal border border-ivory/10 rounded-sm p-4">
          <h3 className="text-lg mb-2">Stand up. Roll your shoulders back.</h3>
          <p className="text-ivory/50 text-sm mb-3">
            Hold this position for 10 seconds. Notice the shift.
          </p>
          <div className="flex gap-2">
            <button className="flex-1 py-2 text-sm border border-ivory/20 rounded-sm text-ivory/60 hover:bg-ivory/5">
              Skip
            </button>
            <button className="flex-1 py-2 text-sm bg-violet text-black font-mono uppercase rounded-sm">
              Done
            </button>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="font-mono text-sm uppercase tracking-wide text-ivory/60 mb-3">
          Recent
        </h2>
        <div className="space-y-2">
          {recentDoses && recentDoses.length > 0 ? (
            recentDoses.slice(0, 5).map((dose) => {
              const d = dose as DoseLog;
              const doseDate = new Date(d.timestamp);
              const isToday = doseDate.toDateString() === new Date().toDateString();
              const dateStr = isToday ? 'Today' : doseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = doseDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              return (
                <div key={d.id} className="bg-charcoal/50 border border-ivory/10 rounded-sm p-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-mono">{d.amount}g</div>
                    <div className="text-ivory/50 text-xs">{dateStr} at {timeStr}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ivory/60">{d.food_state}</div>
                    {d.effective_dose && (
                      <div className="text-xs text-ivory/40">eff: {d.effective_dose.toFixed(3)}g</div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-charcoal/50 border border-ivory/10 rounded-sm p-3 flex justify-between items-center">
              <div>
                <div className="text-sm">No recent doses</div>
                <div className="text-ivory/50 text-xs">Log your first dose to begin</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-ivory/10 p-4 flex justify-around">
        <Link href="/compass" className="text-orange font-mono text-xs uppercase">
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
