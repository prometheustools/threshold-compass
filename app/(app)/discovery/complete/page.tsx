'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'

function DiscoveryCompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [floor, setFloor] = useState<number | null>(null)
  const [sweetSpot, setSweetSpot] = useState<number | null>(null)
  const [ceiling, setCeiling] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [qualifier, setQualifier] = useState<string | null>(null)
  const [showFloor, setShowFloor] = useState(false)
  const [showSweetSpot, setShowSweetSpot] = useState(false)
  const [showCeiling, setShowCeiling] = useState(false)

  useEffect(() => {
    const floorParam = searchParams.get('floor')
    const sweetSpotParam = searchParams.get('sweet_spot')
    const ceilingParam = searchParams.get('ceiling')
    const confidenceParam = searchParams.get('confidence')
    const qualifierParam = searchParams.get('qualifier')

    if (floorParam && sweetSpotParam && ceilingParam && confidenceParam && qualifierParam) {
      setFloor(parseFloat(floorParam))
      setSweetSpot(parseFloat(sweetSpotParam))
      setCeiling(parseFloat(ceilingParam))
      setConfidence(parseInt(confidenceParam))
      setQualifier(decodeURIComponent(qualifierParam))

      setTimeout(() => setShowFloor(true), 800)
      setTimeout(() => setShowSweetSpot(true), 1600)
      setTimeout(() => setShowCeiling(true), 2400)
    } else {
      setTimeout(() => {
        router.push('/compass')
      }, 3000)
    }
  }, [searchParams, router])

  const handleContinue = () => {
    router.push('/compass')
  }

  if (floor === null || sweetSpot === null || ceiling === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base text-ivory p-4">
        <Card padding="lg" className="w-full max-w-md text-center">
          <h1 className="font-mono text-xl uppercase text-orange mb-4">Calculating...</h1>
          <p className="text-bone">Processing your discovery results.</p>
          <p className="text-bone text-sm mt-2">Redirecting to Compass in 3 seconds.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base text-ivory p-4">
      <Card padding="lg" className="w-full max-w-md text-center space-y-6">
        <h1 className="font-mono text-xl uppercase text-orange mb-4 transition-settle">RANGE FOUND</h1>

        <div className="space-y-4">
          <div
            className={`
              relative p-4 rounded-card transition-all duration-800 ease-out
              ${showFloor ? 'bg-status-clear/20 opacity-100' : 'opacity-0'}
            `}
          >
            <p className="font-mono text-lg text-ivory">Floor: {floor}mg</p>
            <p className="font-sans text-bone text-sm">Below this, you feel nothing.</p>
          </div>

          <div
            className={`
              relative p-4 rounded-card transition-all duration-800 ease-out
              ${showSweetSpot ? 'bg-status-mild/20 opacity-100' : 'opacity-0'}
            `}
          >
            <p className="font-mono text-lg text-ivory">Sweet Spot: {sweetSpot}mg</p>
            <p className="font-sans text-bone text-sm">Your threshold zone.</p>
          </div>

          <div
            className={`
              relative p-4 rounded-card transition-all duration-800 ease-out
              ${showCeiling ? 'bg-status-elevated/20 opacity-100' : 'opacity-0'}
            `}
          >
            <p className="font-mono text-lg text-ivory">Ceiling: {ceiling}mg</p>
            <p className="font-sans text-bone text-sm">Above this, interference rises.</p>
          </div>
        </div>

        {showCeiling && (
          <div className="text-bone transition-opacity duration-800 ease-out opacity-100">
            {confidence !== null && <p className="font-sans text-sm mt-4">Confidence: {confidence}%</p>}
            {qualifier && <p className="font-sans text-sm">{qualifier}</p>}
          </div>
        )}

        {showCeiling && (
          <Button onClick={handleContinue} className="w-full min-h-[44px] transition-opacity duration-800 ease-out opacity-100">
            Continue to Compass
          </Button>
        )}
      </Card>
    </div>
  )
}

export default function DiscoveryCompletePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-base text-ivory p-4">
        <LoadingState message="loading" size="md" />
      </div>
    }>
      <DiscoveryCompleteContent />
    </Suspense>
  )
}
