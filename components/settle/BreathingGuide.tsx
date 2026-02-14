'use client'

import { useState, useEffect, useRef } from 'react'
import type { BreathingPattern } from '@/types'

interface BreathingGuideProps {
  pattern: BreathingPattern
}

export default function BreathingGuide({ pattern }: BreathingGuideProps) {
  const [currentPrompt, setCurrentPrompt] = useState('Breathe in...')
  const circleRef = useRef<HTMLDivElement>(null)

  const { inhale, hold_in, exhale, hold_out, cycle_seconds } = pattern

  useEffect(() => {
    let timer = 0
    const interval = setInterval(() => {
      if (timer < inhale) {
        setCurrentPrompt('Breathe in...')
      } else if (timer < inhale + hold_in && hold_in > 0) {
        setCurrentPrompt('Hold...')
      } else if (timer < inhale + hold_in + exhale) {
        setCurrentPrompt('Let go...')
      } else if (hold_out > 0) {
        setCurrentPrompt('Hold...')
      }
      timer = (timer + 1) % cycle_seconds
    }, 1000)

    return () => clearInterval(interval)
  }, [inhale, hold_in, exhale, hold_out, cycle_seconds])

  useEffect(() => {
    if (!circleRef.current) return
    const el = circleRef.current
    
    const total = cycle_seconds * 1000
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) % total
      const progress = elapsed / total
      
      const inEnd = inhale / cycle_seconds
      const holdInEnd = (inhale + hold_in) / cycle_seconds
      const exEnd = (inhale + hold_in + exhale) / cycle_seconds
      
      let scale = 0.6
      let opacity = 0.2
      
      if (progress < inEnd) {
        const p = progress / inEnd
        scale = 0.6 + 0.4 * p
        opacity = 0.2 + 0.2 * p
      } else if (progress < holdInEnd) {
        scale = 1.0
        opacity = 0.4
      } else if (progress < exEnd) {
        const p = (progress - holdInEnd) / (exEnd - holdInEnd)
        scale = 1.0 - 0.4 * p
        opacity = 0.4 - 0.2 * p
      } else {
        scale = 0.6
        opacity = 0.2
      }
      
      el.style.transform = `scale(${scale})`
      el.style.boxShadow = `0 0 ${20 + 40 * (scale - 0.6) / 0.4}px rgba(224,122,62,${opacity})`
      
      requestAnimationFrame(animate)
    }
    
    const frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [inhale, hold_in, exhale, cycle_seconds])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <p className="text-bone text-sm mb-2 font-mono uppercase tracking-widest">
        {pattern.name}
      </p>
      <p className="text-ash text-xs mb-12">{pattern.description}</p>

      <div
        ref={circleRef}
        className="w-48 h-48 rounded-full bg-orange/20 flex items-center justify-center"
      >
        <span className="text-xl text-ivory font-sans transition-settle">
          {currentPrompt}
        </span>
      </div>
    </div>
  )
}
