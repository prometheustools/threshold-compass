#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUBSTANCES = ['psilocybin', 'lsd']
const CONTEXTS = ['work', 'creative', 'social', 'rest', 'exercise']
const PHASES = ['baseline', 'context']

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1))
}

function classifyDay(signalScore, interferenceScore, sensitivity) {
  const threshold = sensitivity * 0.15
  if (interferenceScore > 0.7) return 'red'
  if (signalScore > threshold && interferenceScore < 0.3) return 'green'
  if (signalScore > threshold * 0.5) return 'yellow'
  return 'unclassified'
}

function thresholdFeel(signalScore, interferenceScore, sensitivity) {
  const threshold = sensitivity * 0.15
  if (interferenceScore > 0.7) return 'too_high'
  if (signalScore > threshold * 1.2) return 'strong'
  if (signalScore > threshold * 0.8) return 'optimal'
  if (signalScore > threshold * 0.5) return 'subtle'
  return 'barely_noticed'
}

function generateProfile(config) {
  const { name, sensitivity, toleranceRate, consistency, noise, substance } = config
  const doses = []
  const days = 60
  let carryover = 0
  let runningThreshold = 0.15 * sensitivity

  for (let i = 0; i < days; i++) {
    const isBaseline = i < 10 || Math.random() > 0.7
    const phase = isBaseline ? 'baseline' : 'context'
    const doseNumber = isBaseline ? 0 : (i - 10) + 1

    const baseAmount = randomBetween(0.05, 0.15) * sensitivity
    const noiseFactor = (Math.random() - 0.5) * noise * 0.1
    const consistencyFactor = consistency > 0.7 ? 1 : randomBetween(consistency, 1)
    const amount = baseAmount * consistencyFactor + noiseFactor

    const effectiveDose = amount * (1 - carryover)
    const signalScore = effectiveDose * randomBetween(0.8, 1.2)
    const textureScore = randomBetween(0.1, 0.9)
    const interferenceScore = Math.max(0, (effectiveDose - runningThreshold) * 2 + randomBetween(-0.1, 0.1))

    const dayClassification = classifyDay(signalScore, interferenceScore, sensitivity)
    const feel = thresholdFeel(signalScore, interferenceScore, sensitivity)

    const contextTags = phase === 'context' 
      ? [CONTEXTS[randomInt(0, CONTEXTS.length - 1)]]
      : []

    doses.push({
      id: `dose_${i + 1}`,
      timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString(),
      amount: Math.round(amount * 1000) / 1000,
      substance,
      phase,
      dose_number: doseNumber,
      signal_score: Math.round(signalScore * 1000) / 1000,
      texture_score: Math.round(textureScore * 1000) / 1000,
      interference_score: Math.round(interferenceScore * 1000) / 1000,
      day_classification: dayClassification,
      threshold_feel: feel,
      context_tags: contextTags,
      carryover_score: Math.round(carryover * 1000) / 1000,
      effective_dose: Math.round(effectiveDose * 1000) / 1000,
    })

    carryover = Math.max(0, carryover + toleranceRate * effectiveDose - 0.1)
    runningThreshold = runningThreshold * (1 + toleranceRate * 0.1)
  }

  const greens = doses.filter(d => d.day_classification === 'green').length
  const yellows = doses.filter(d => d.day_classification === 'yellow').length
  const reds = doses.filter(d => d.day_classification === 'red').length

  const effectiveDoses = doses.map(d => d.effective_dose).filter(d => d > 0)
  const sortedEffs = effectiveDoses.slice().sort((a, b) => a - b)

  return {
    name,
    config,
    doses,
    max_effective_dose: Math.max(...effectiveDoses),
    summary: {
      green: greens,
      yellow: yellows,
      red: reds,
      unclassified: doses.filter(d => d.day_classification === 'unclassified').length,
      floor: sortedEffs[Math.floor(sortedEffs.length * 0.1)] || 0,
      sweet_spot: sortedEffs[Math.floor(sortedEffs.length * 0.5)] || 0,
      ceiling: sortedEffs[Math.floor(sortedEffs.length * 0.9)] || 0,
      confidence: Math.round((greens / (greens + yellows + reds + 1)) * 100) / 100,
    }
  }
}

const profiles = [
  { name: 'cautious_responder', sensitivity: 0.6, toleranceRate: 0.05, consistency: 0.9, noise: 0.2, substance: 'psilocybin' },
  { name: 'average_responder', sensitivity: 1.0, toleranceRate: 0.1, consistency: 0.75, noise: 0.4, substance: 'psilocybin' },
  { name: 'high_sensitivity', sensitivity: 1.8, toleranceRate: 0.08, consistency: 0.85, noise: 0.3, substance: 'lsd' },
  { name: 'inconsistent_responder', sensitivity: 1.2, toleranceRate: 0.15, consistency: 0.4, noise: 0.8, substance: 'psilocybin' },
  { name: 'rapid_tolerance_buildup', sensitivity: 1.0, toleranceRate: 0.35, consistency: 0.8, noise: 0.2, substance: 'lsd' },
]

const outDir = path.join(__dirname, 'fixtures')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

profiles.forEach(profile => {
  const data = generateProfile(profile)
  const filename = `${profile.name}.json`
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(data, null, 2))
  console.log(`Generated ${filename}`)
})

console.log(`\nDone. Generated ${profiles.length} fixtures.`)
