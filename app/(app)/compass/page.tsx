import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CompassPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // TODO: Fetch latest dose log and calculate carryover
  // For now, show static structure

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
            <span className="text-2xl font-mono text-green-400">CLEAR</span>
          </div>
          <p className="text-ivory/50 text-sm">
            No tolerance detected. Ready for next session.
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
          <div className="bg-charcoal/50 border border-ivory/10 rounded-sm p-3 flex justify-between items-center">
            <div>
              <div className="text-sm">No recent doses</div>
              <div className="text-ivory/50 text-xs">Log your first dose to begin</div>
            </div>
          </div>
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
