#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const SCENARIOS_DIR = path.join(ROOT, 'scenarios')
const OUT_DIR = path.join(ROOT, 'out')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { all: false, scenario: null, format: 'both', help: false }
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--all') out.all = true
    if (args[i] === '--scenario' && args[i + 1]) out.scenario = args[i + 1]
    if (args[i] === '--help' || args[i] === '-h') out.help = true
    if (args[i] === '--json-only') out.format = 'json'
    if (args[i] === '--md-only') out.format = 'md'
  }
  return out
}

function printHelp() {
  console.log(`
Protocol Replay Forge - Simulate discovery protocols over time

Usage:
  node replay.mjs [options]

Options:
  --scenario <name>   Run a specific scenario (without .json)
  --all               Run all scenarios in scenarios/
  --json-only         Only output JSON, skip markdown
  --md-only           Only output markdown, skip JSON
  --help, -h          Show this help message

Examples:
  node replay.mjs --scenario steady_discovery
  node replay.mjs --all
  node replay.mjs --all --json-only

Scenarios available:
${listScenarioFiles().map(f => `  - ${f.replace('.json', '')}`).join('\n')}

Outputs written to out/.
`)
}

function ensureOut() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
}

function mulberry32(seed) {
  let t = seed >>> 0
  return function rand() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function listScenarioFiles() {
  return fs.readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith('.json')).sort()
}

function loadScenario(file) {
  const raw = fs.readFileSync(path.join(SCENARIOS_DIR, file), 'utf8')
  return JSON.parse(raw)
}

function scheduleToSpacing(schedule) {
  if (schedule === 'every_2_days') return 2
  return 3
}

function classifyDay(signal, texture, interference) {
  if (signal >= 6 && interference <= 2) return 'green'
  if (interference >= 5) return 'red'
  if (interference >= 3 || texture >= 6) return 'yellow'
  return 'unclassified'
}

function thresholdFeelFromScores(signal, interference) {
  if (signal <= 2 && interference <= 2) return 'nothing'
  if (signal >= 6 && interference <= 2) return 'sweetspot'
  if (interference >= 5) return 'over'
  return 'under'
}

function calculateCarryover(prev, hoursSinceLastDose) {
  if (prev <= 0) return 0
  const decay = Math.exp(-hoursSinceLastDose / 24)
  return Math.max(0, Math.round(prev * decay))
}

function runScenario(scenario) {
  const rand = mulberry32(scenario.seed)
  const spacing = scheduleToSpacing(scenario.schedule)
  const events = []
  let carryover = 0
  let doseNumber = 0
  let lastDoseDay = null
  const start = new Date('2026-01-01T00:00:00.000Z')

  for (let day = 1; day <= scenario.days; day += 1) {
    const date = new Date(start.getTime() + (day - 1) * 24 * 60 * 60 * 1000)
    const shouldDoseByPlan = (day - 1) % spacing === 0
    const adheres = rand() <= scenario.adherence
    const action = shouldDoseByPlan && adheres ? 'dose' : 'rest'

    if (action === 'dose') {
      doseNumber += 1
      const phase = doseNumber <= 4 ? 'baseline' : 'context'
      const variation = 1 + (rand() - 0.5) * 2 * scenario.variability
      const escalationFactor = scenario.name === 'overeager_escalation' ? 1 + doseNumber * 0.015 : 1
      const doseAmount = Number((scenario.base_dose * variation * escalationFactor).toFixed(3))
      const hoursSince = lastDoseDay === null ? 72 : (day - lastDoseDay) * 24

      carryover = calculateCarryover(carryover, hoursSince)
      const acuteLoad = Math.min(100, Math.round(doseAmount * 1000 * 0.7))
      carryover = Math.min(100, carryover + acuteLoad)

      const effectiveDose = Number((doseAmount * (1 - carryover / 100)).toFixed(3))
      const sensitivityBias = (scenario.sensitivity - 3) * 0.8
      const signal = Math.max(0, Math.min(10, Math.round((6 + rand() * 2 - sensitivityBias - carryover / 35) * 10) / 10))
      const texture = Math.max(0, Math.min(10, Math.round((4 + rand() * 3 + sensitivityBias * 0.4) * 10) / 10))
      const interference = Math.max(0, Math.min(10, Math.round((1.5 + carryover / 20 + rand() * 2 + sensitivityBias) * 10) / 10))
      const dayClass = classifyDay(signal, texture, interference)

      events.push({
        day_index: day,
        date: date.toISOString().slice(0, 10),
        action,
        dose_amount: doseAmount,
        carryover_score: carryover,
        effective_dose: effectiveDose,
        signal_score: signal,
        texture_score: texture,
        interference_score: interference,
        day_classification: dayClass,
        threshold_feel: thresholdFeelFromScores(signal, interference),
        phase,
        dose_number: doseNumber,
      })
      lastDoseDay = day
      continue
    }

    const hoursSince = lastDoseDay === null ? 24 : (day - lastDoseDay) * 24
    carryover = calculateCarryover(carryover, hoursSince)
    events.push({
      day_index: day,
      date: date.toISOString().slice(0, 10),
      action: 'rest',
      dose_amount: 0,
      carryover_score: carryover,
      effective_dose: 0,
      signal_score: 0,
      texture_score: 0,
      interference_score: 0,
      day_classification: 'unclassified',
      threshold_feel: 'under',
      phase: doseNumber <= 4 ? 'baseline' : 'context',
      dose_number: null,
    })
  }

  const doseEvents = events.filter((e) => e.action === 'dose')
  const green = doseEvents.filter((e) => e.day_classification === 'green').length
  const yellow = doseEvents.filter((e) => e.day_classification === 'yellow').length
  const red = doseEvents.filter((e) => e.day_classification === 'red').length

  const floorCandidates = doseEvents.filter((e) => e.threshold_feel === 'nothing').map((e) => e.dose_amount)
  const sweetCandidates = doseEvents.filter((e) => e.threshold_feel === 'sweetspot').map((e) => e.dose_amount)
  const overCandidates = doseEvents.filter((e) => e.threshold_feel === 'over').map((e) => e.dose_amount)

  const floor = floorCandidates.length ? Math.max(...floorCandidates) : null
  const sweet = sweetCandidates.length
    ? Number((sweetCandidates.reduce((sum, value) => sum + value, 0) / sweetCandidates.length).toFixed(3))
    : null
  const ceiling = overCandidates.length ? Math.min(...overCandidates) : null

  let trendNote = 'stabilizing'
  if (red > Math.max(2, Math.floor(doseEvents.length * 0.22))) trendNote = 'overheating'
  else if (yellow > green) trendNote = 'drifting'

  const interventions =
    trendNote === 'overheating'
      ? ['Increase rest interval by 1 day.', 'Reduce next 2 doses by 10-15%.', 'Prioritize low-noise context tags.']
      : trendNote === 'drifting'
      ? ['Hold dose steady for 3 sessions.', 'Capture post-dose STI every dose day.', 'Constrain timing to a single window.']
      : ['Maintain current schedule.', 'Keep context tags consistent.', 'Re-check threshold range after 10 doses.']

  return {
    scenario: scenario.name,
    generated_at: new Date().toISOString(),
    events,
    summary: {
      dose_count: doseEvents.length,
      classification_ratios: {
        green,
        yellow,
        red,
        unclassified: Math.max(0, doseEvents.length - green - yellow - red),
      },
      threshold_projection: { floor, sweet, ceiling },
      trend_note: trendNote,
      interventions,
    },
  }
}

function writeResult(name, result) {
  const file = path.join(OUT_DIR, `${name}.json`)
  fs.writeFileSync(file, JSON.stringify(result, null, 2))
  return file
}

function writeMarkdown(name, result) {
  const { summary, events } = result
  const doseEvents = events.filter(e => e.action === 'dose')
  
  const md = `# ${name}

Generated: ${result.generated_at}

## Summary

| Metric | Value |
|--------|-------|
| Dose Count | ${summary.dose_count} |
| Optimal Days | ${summary.classification_ratios.green} |
| Caution Days | ${summary.classification_ratios.yellow} |
| Too High | ${summary.classification_ratios.red} |
| Trend | ${summary.trend_note} |

## Threshold Projection

| Level | Dose (mg) |
|-------|-----------|
| Floor | ${summary.threshold_projection.floor ?? 'N/A'} |
| Sweet Spot | ${summary.threshold_projection.sweet ?? 'N/A'} |
| Ceiling | ${summary.threshold_projection.ceiling ?? 'N/A'} |

## Interventions

${summary.interventions.map(i => `- ${i}`).join('\n')}

## Dose Log

| Day | Date | Dose | Carryover | Signal | Interference | Class | Feel |
|-----|------|------|-----------|--------|--------------|-------|------|
${doseEvents.map(e => `| ${e.day_index} | ${e.date} | ${e.dose_amount} | ${e.carryover_score} | ${e.signal_score} | ${e.interference_score} | ${e.day_classification} | ${e.threshold_feel} |`).join('\n')}

---
*Generated by Protocol Replay Forge*
`
  
  const file = path.join(OUT_DIR, `${name}.md`)
  fs.writeFileSync(file, md)
  return file
}

function writeSummary(summaries, names) {
  const md = `# Protocol Replay Summary

Generated: ${new Date().toISOString()}

## Scenarios

| Scenario | Doses | Optimal | Caution | Too High | Trend |
|----------|-------|---------|---------|----------|-------|
${names.map((name, i) => {
  const s = summaries[i]
  return `| ${name} | ${s.dose_count} | ${s.classification_ratios.green} | ${s.classification_ratios.yellow} | ${s.classification_ratios.red} | ${s.trend_note} |`
}).join('\n')}

---
*Protocol Replay Forge*
`
  
  fs.writeFileSync(path.join(OUT_DIR, 'index.md'), md)
}

function main() {
  ensureOut()
  const args = parseArgs()
  
  if (args.help) {
    printHelp()
    return
  }
  
  const files = listScenarioFiles()
  const selected = args.all
    ? files
    : files.filter((f) => f.replace('.json', '') === args.scenario)

  if (!selected.length) {
    console.error('No scenario selected. Use --all or --scenario <name>.')
    console.error('Run with --help for usage information.')
    process.exit(1)
  }

  const produced = []
  const summaries = []
  const names = []
  
  for (const file of selected) {
    const scenario = loadScenario(file)
    const result = runScenario(scenario)
    names.push(scenario.name)
    const jsonPath = writeResult(scenario.name, result)
    produced.push({ name: scenario.name, path: jsonPath, result })
    
    if (args.format === 'both' || args.format === 'md') {
      const mdPath = writeMarkdown(scenario.name, result)
      produced[produced.length - 1].mdPath = mdPath
    }
    
    summaries.push(result.summary)
  }

  writeSummary(summaries, names)

  console.log(`Wrote ${produced.length} run(s).`)
  produced.forEach(p => {
    console.log(`  - ${path.relative(ROOT, p.path)}`)
    if (p.mdPath) console.log(`  - ${path.relative(ROOT, p.mdPath)}`)
  })
}

main()
