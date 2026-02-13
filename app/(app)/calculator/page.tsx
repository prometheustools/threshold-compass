'use client'

import { useState } from 'react'
import { Scale, Calculator, Info, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface CalculatorInputs {
  substance: 'psilocybin' | 'lsd'
  bodyWeight: number
  experienceLevel: 'none' | 'low' | 'moderate' | 'high'
  sensitivity: number
  tolerance: number
}

interface DoseRecommendation {
  threshold: number
  range: { min: number; max: number }
  description: string
}

const SUBSTANCE_DATA = {
  psilocybin: {
    name: 'Psilocybin',
    unit: 'g',
    baselineThreshold: 0.1, // mg
    potencyFactor: 1,
  },
  lsd: {
    name: 'LSD',
    unit: 'μg',
    baselineThreshold: 50, // micrograms
    potencyFactor: 0.5,
  },
}

const EXPERIENCE_MODIFIERS = {
  none: 0.5,
  low: 0.75,
  moderate: 1.0,
  high: 1.25,
}

export default function CalculatorPage() {
  const [step, setStep] = useState(1)
  const [inputs, setInputs] = useState<CalculatorInputs>({
    substance: 'psilocybin',
    bodyWeight: 70,
    experienceLevel: 'moderate',
    sensitivity: 3,
    tolerance: 0,
  })
  const [result, setResult] = useState<DoseRecommendation | null>(null)

  const calculateDose = (): DoseRecommendation => {
    const substance = SUBSTANCE_DATA[inputs.substance]
    const expMod = EXPERIENCE_MODIFIERS[inputs.experienceLevel]
    const weightFactor = inputs.bodyWeight / 70
    const sensitivityFactor = inputs.sensitivity / 3
    const toleranceFactor = 1 + inputs.tolerance * 0.1

    const rawThreshold = substance.baselineThreshold * expMod * weightFactor * sensitivityFactor / toleranceFactor
    
    const threshold = inputs.substance === 'psilocybin' 
      ? Math.round(rawThreshold * 1000) / 1000
      : Math.round(rawThreshold)

    const range = inputs.substance === 'psilocybin'
      ? { min: Math.round(threshold * 0.7 * 1000) / 1000, max: Math.round(threshold * 1.3 * 1000) / 1000 }
      : { min: Math.round(threshold * 0.7), max: Math.round(threshold * 1.3) }

    let description = ''
    if (inputs.experienceLevel === 'none') {
      description = 'Starting low. This is a conservative dose for beginners. Wait 2-3 hours before considering more.'
    } else if (inputs.experienceLevel === 'low') {
      description = 'Light dose appropriate for someone with minimal experience. Good starting point.'
    } else if (inputs.experienceLevel === 'moderate') {
      description = 'Standard dose for regular users. This should produce noticeable effects.'
    } else {
      description = 'Higher end dose. Appropriate for experienced users only.'
    }

    return { threshold, range, description }
  }

  const handleCalculate = () => {
    setResult(calculateDose())
    setStep(3)
  }

  const reset = () => {
    setStep(1)
    setResult(null)
    setInputs({
      substance: 'psilocybin',
      bodyWeight: 70,
      experienceLevel: 'moderate',
      sensitivity: 3,
      tolerance: 0,
    })
  }

  return (
    <div className="min-h-screen bg-base p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-orange" />
            </div>
            <div>
              <p className="font-mono text-xs tracking-wider uppercase text-bone">Tool</p>
              <h1 className="text-xl font-semibold text-ivory">Threshold Calculator</h1>
            </div>
          </div>
        </header>

        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono ${step >= 1 ? 'bg-orange text-base' : 'bg-elevated text-ash'}`}>1</div>
            <div className="flex-1 h-0.5 bg-elevated" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono ${step >= 2 ? 'bg-orange text-base' : 'bg-elevated text-ash'}`}>2</div>
            <div className="flex-1 h-0.5 bg-elevated" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono ${step >= 3 ? 'bg-orange text-base' : 'bg-elevated text-ash'}`}>3</div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-ivory">What are you working with?</h2>
              
              <div>
                <label className="block text-sm text-bone mb-2">Substance</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['psilocybin', 'lsd'] as const).map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setInputs({ ...inputs, substance: sub })}
                      className={`p-4 rounded-card border transition-settle ${
                        inputs.substance === sub
                          ? 'border-orange bg-orange/10 text-orange'
                          : 'border-ember/30 bg-elevated text-ivory hover:border-ember/60'
                      }`}
                    >
                      <span className="block font-medium">{SUBSTANCE_DATA[sub].name}</span>
                      <span className="text-xs text-bone">{SUBSTANCE_DATA[sub].unit}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-bone mb-2">Body Weight (kg)</label>
                <input
                  type="number"
                  value={inputs.bodyWeight}
                  onChange={(e) => setInputs({ ...inputs, bodyWeight: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-elevated border border-ember/30 rounded-button text-ivory focus:border-orange focus:outline-none"
                  min="30"
                  max="200"
                />
              </div>

              <div>
                <label className="block text-sm text-bone mb-2">Experience Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['none', 'low', 'moderate', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setInputs({ ...inputs, experienceLevel: level })}
                      className={`px-3 py-2 rounded-button border text-sm transition-settle ${
                        inputs.experienceLevel === level
                          ? 'border-orange bg-orange/10 text-orange'
                          : 'border-ember/30 bg-elevated text-bone hover:border-ember/60'
                      }`}
                    >
                      {level === 'none' && 'None (first time)'}
                      {level === 'low' && 'Low (1-5 experiences)'}
                      {level === 'moderate' && 'Moderate (regular)'}
                      {level === 'high' && 'High (extensive)'}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-ivory">Refine your estimate</h2>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-bone">Sensitivity</label>
                  <span className="text-sm text-orange font-mono">{inputs.sensitivity}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={inputs.sensitivity}
                  onChange={(e) => setInputs({ ...inputs, sensitivity: Number(e.target.value) })}
                  className="w-full accent-orange"
                />
                <div className="flex justify-between text-xs text-ash mt-1">
                  <span>Less sensitive</span>
                  <span>Very sensitive</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-bone">Current Tolerance</label>
                  <span className="text-sm text-orange font-mono">{inputs.tolerance}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={inputs.tolerance}
                  onChange={(e) => setInputs({ ...inputs, tolerance: Number(e.target.value) })}
                  className="w-full accent-orange"
                />
                <div className="flex justify-between text-xs text-ash mt-1">
                  <span>None</span>
                  <span>High</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleCalculate} className="flex-1">
                  Calculate
                </Button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-orange/20 flex items-center justify-center mx-auto mb-4">
                  <Scale className="w-8 h-8 text-orange" />
                </div>
                <h2 className="text-lg font-medium text-ivory">Your Estimated Threshold</h2>
              </div>

              <div className="text-center py-6 bg-elevated rounded-card">
                <p className="text-4xl font-bold text-orange mb-2">
                  {result.threshold}
                  <span className="text-lg text-bone ml-1">
                    {inputs.substance === 'psilocybin' ? 'g' : 'μg'}
                  </span>
                </p>
                <p className="text-bone">
                  Range: {result.range.min} - {result.range.max} {inputs.substance === 'psilocybin' ? 'g' : 'μg'}
                </p>
              </div>

              <div className="p-4 bg-surface border border-ember/20 rounded-card">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-bone">{result.description}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={reset} className="flex-1">
                  Start Over
                </Button>
                <Button onClick={() => setStep(1)} className="flex-1">
                  Adjust Values
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-xs text-ash text-center mt-4">
          This is an estimate only. Start low, go slow. Individual responses vary.
        </p>
      </div>
    </div>
  )
}
