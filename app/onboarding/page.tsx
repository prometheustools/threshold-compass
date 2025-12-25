'use client';

import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = () => {
    router.push('/compass');
  };

  return (
    <main className="min-h-screen bg-black text-ivory p-6 flex flex-col">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto text-center">
        <h1 className="font-mono text-3xl uppercase tracking-wide mb-4">
          Welcome
        </h1>
        <p className="text-ivory/70 mb-8">
          Threshold Compass is a precision instrument for those who take microdosing seriously.
        </p>

        <div className="space-y-4 text-left bg-charcoal rounded-sm p-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-orange font-mono">01</span>
            <div>
              <h3 className="font-mono text-sm uppercase">Log your doses</h3>
              <p className="text-ivory/50 text-sm">Track amount, timing, and batch for precision.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-orange font-mono">02</span>
            <div>
              <h3 className="font-mono text-sm uppercase">Check in daily</h3>
              <p className="text-ivory/50 text-sm">Quick signals: energy, clarity, stability.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-orange font-mono">03</span>
            <div>
              <h3 className="font-mono text-sm uppercase">Discover your threshold</h3>
              <p className="text-ivory/50 text-sm">Find your personal sweet spot over time.</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleComplete}
          className="w-full bg-orange text-black font-mono uppercase tracking-wide py-4 rounded-sm hover:bg-orange/90 transition-colors"
        >
          Get Started
        </button>

        <p className="text-ivory/40 text-xs mt-6">
          This is an educational tool, not medical advice.
          Always prioritize safety and harm reduction.
        </p>
      </div>
    </main>
  );
}
