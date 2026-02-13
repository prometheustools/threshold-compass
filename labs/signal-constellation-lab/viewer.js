const fixtures = [
  'cautious_responder.json',
  'average_responder.json',
  'high_sensitivity.json',
  'inconsistent_responder.json',
  'rapid_tolerance_buildup.json',
]

const colorMap = {
  green: '#4A9B6B',
  yellow: '#C9A227',
  red: '#B54A4A',
  unclassified: '#8A8A8A',
}

const colorFor = (c) => colorMap[c] || colorMap.unclassified

const sel = document.getElementById('fixture')
const viewModeSel = document.getElementById('viewMode')
const showTrendChk = document.getElementById('showTrend')
const showZonesChk = document.getElementById('showZones')
const reloadBtn = document.getElementById('reload')
const configRow = document.getElementById('configRow')
const statsEl = document.getElementById('stats')
const canvas = document.getElementById('constellation')
const ctx = canvas.getContext('2d')
const tooltip = document.getElementById('tooltip')

let currentData = null
let hoveredPoint = null

fixtures.forEach(f => {
  const o = document.createElement('option')
  o.value = f
  o.textContent = f.replace('.json', '').replace(/_/g, ' ')
  sel.appendChild(o)
})

async function loadAndDraw() {
  const file = sel.value
  const res = await fetch(`fixtures/${file}`)
  currentData = await res.json()
  draw()
}

function draw() {
  if (!currentData) return
  const { doses, summary, config, max_effective_dose } = currentData
  const viewMode = viewModeSel.value

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#090909'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const pad = { left: 50, right: 30, top: 30, bottom: 40 }
  const w = canvas.width - pad.left - pad.right
  const h = canvas.height - pad.top - pad.bottom

  drawAxes(ctx, pad, w, h, viewMode, doses, summary, max_effective_dose)

  if (showZonesChk.checked) {
    drawZones(ctx, pad, w, h, summary, max_effective_dose, viewMode)
  }

  if (showTrendChk.checked) {
    drawTrend(ctx, pad, w, h, doses, viewMode, max_effective_dose)
  }

  doses.forEach((d, i) => {
    const x = pad.left + (i / Math.max(1, doses.length - 1)) * w
    const y = getY(d, viewMode, pad, h, max_effective_dose)
    
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = colorFor(d.day_classification)
    ctx.fill()
    ctx.strokeStyle = '#00000044'
    ctx.lineWidth = 1
    ctx.stroke()

    d._x = x
    d._y = y
  })

  drawStats(summary, config)
}

function getY(d, mode, pad, h, maxDose) {
  let val
  switch (mode) {
    case 'signal': val = d.signal_score; break
    case 'interference': val = d.interference_score; break
    case 'carryover': val = d.carryover_score; break
    default: val = d.effective_dose
  }
  const max = mode === 'signal' ? 0.3 : mode === 'interference' ? 1 : maxDose
  return pad.top + h - (val / max) * h
}

function drawAxes(ctx, pad, w, h, mode, doses, summary, maxDose) {
  ctx.fillStyle = '#8a8a8a'
  ctx.font = '10px ui-monospace'
  ctx.textAlign = 'center'

  const labels = { effective: 'Effective Dose', signal: 'Signal Score', interference: 'Interference', carryover: 'Carryover' }
  ctx.fillText(labels[mode] || 'Value', pad.left + w / 2, canvas.height - 10)

  ctx.textAlign = 'right'
  ctx.fillText('High', pad.left - 8, pad.top + 10)
  ctx.fillText('Low', pad.left - 8, pad.top + h)

  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, pad.top + h)
  ctx.lineTo(pad.left + w, pad.top + h)
  ctx.stroke()

  ctx.fillStyle = '#4a4a4a'
  ctx.textAlign = 'center'
  doses.forEach((_, i) => {
    if (i % 10 === 0) {
      const x = pad.left + (i / Math.max(1, doses.length - 1)) * w
      ctx.fillText(`D${i + 1}`, x, pad.top + h + 15)
    }
  })
}

function drawZones(ctx, pad, w, h, summary, maxDose, mode) {
  const { floor, sweet_spot, ceiling } = summary
  const max = mode === 'signal' ? 0.3 : mode === 'interference' ? 1 : maxDose

  const zones = [
    { y: floor, color: '#4a9b6b22', label: 'floor' },
    { y: sweet_spot, color: '#e07a3e33', label: 'sweet' },
    { y: ceiling, color: '#b54a4a22', label: 'ceiling' },
  ]

  zones.forEach(zone => {
    const y = pad.top + h - (zone.y / max) * h
    ctx.fillStyle = zone.color
    ctx.fillRect(pad.left, y - 10, w, 20)
    ctx.strokeStyle = zone.color.replace('22', '66')
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + w, y)
    ctx.stroke()
    ctx.setLineDash([])
  })
}

function drawTrend(ctx, pad, w, h, doses, mode, maxDose) {
  if (doses.length < 2) return

  const max = mode === 'signal' ? 0.3 : mode === 'interference' ? 1 : maxDose
  const windowSize = 5

  ctx.strokeStyle = '#e07a3e88'
  ctx.lineWidth = 2
  ctx.beginPath()

  for (let i = 0; i < doses.length - windowSize; i++) {
    let sum = 0
    for (let j = 0; j < windowSize; j++) {
      const d = doses[i + j]
      sum += mode === 'signal' ? d.signal_score : mode === 'interference' ? d.interference_score : mode === 'carryover' ? d.carryover_score : d.effective_dose
    }
    const avg = sum / windowSize
    const x = pad.left + (i + windowSize / 2) / doses.length * w
    const y = pad.top + h - (avg / max) * h
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function drawStats(summary, config) {
  const { green, yellow, red, unclassified, floor, sweet_spot, ceiling, confidence } = summary

  configRow.innerHTML = `
    <div class="config-item"><div class="config-label">Sensitivity</div><div class="config-val">${config.sensitivity}</div></div>
    <div class="config-item"><div class="config-label">Tolerance</div><div class="config-val">${config.toleranceRate}</div></div>
    <div class="config-item"><div class="config-label">Consistency</div><div class="config-val">${config.consistency}</div></div>
    <div class="config-item"><div class="config-label">Noise</div><div class="config-val">${config.noise}</div></div>
    <div class="config-item"><div class="config-label">Substance</div><div class="config-val">${config.substance}</div></div>
  `

  statsEl.innerHTML = `
    <div class="stat-box"><div class="stat-label">Optimal Days</div><div class="stat-value green">${green}</div></div>
    <div class="stat-box"><div class="stat-label">Caution Days</div><div class="stat-value yellow">${yellow}</div></div>
    <div class="stat-box"><div class="stat-label">Too High</div><div class="stat-value red">${red}</div></div>
    <div class="stat-box"><div class="stat-label">Confidence</div><div class="stat-value" style="color:#e07a3e">${(confidence * 100).toFixed(0)}%</div></div>
    <div class="stat-box"><div class="stat-label">Floor</div><div class="stat-value" style="color:#4a9b6b">${floor?.toFixed(3)}</div></div>
    <div class="stat-box"><div class="stat-label">Sweet Spot</div><div class="stat-value" style="color:#e07a3e">${sweet_spot?.toFixed(3)}</div></div>
    <div class="stat-box"><div class="stat-label">Ceiling</div><div class="stat-value" style="color:#b54a4a">${ceiling?.toFixed(3)}</div></div>
    <div class="stat-box"><div class="stat-label">Unclassified</div><div class="stat-value" style="color:#8a8a8a">${unclassified}</div></div>
  `
}

canvas.addEventListener('mousemove', (e) => {
  if (!currentData) return
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  let found = null
  currentData.doses.forEach(d => {
    if (d._x && d._y) {
      const dist = Math.sqrt((mx - d._x) ** 2 + (my - d._y) ** 2)
      if (dist < 10) found = d
    }
  })

  if (found) {
    tooltip.innerHTML = `
      <div class="tooltip-row"><span class="tooltip-label">Day</span><span class="tooltip-value">${found.id}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Amount</span><span class="tooltip-value">${found.amount}mg</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Effective</span><span class="tooltip-value">${found.effective_dose}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Signal</span><span class="tooltip-value">${found.signal_score}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Interference</span><span class="tooltip-value">${found.interference_score}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Class</span><span class="tooltip-value" style="color:${colorFor(found.day_classification)}">${found.day_classification}</span></div>
    `
    tooltip.style.left = (e.clientX + 15) + 'px'
    tooltip.style.top = (e.clientY + 15) + 'px'
    tooltip.classList.add('visible')
  } else {
    tooltip.classList.remove('visible')
  }
})

canvas.addEventListener('mouseleave', () => {
  tooltip.classList.remove('visible')
})

sel.addEventListener('change', loadAndDraw)
viewModeSel.addEventListener('change', draw)
showTrendChk.addEventListener('change', draw)
showZonesChk.addEventListener('change', draw)

reloadBtn.addEventListener('click', async () => {
  const { spawn } = await import('node:child_process')
  spawn('node', ['generate-fixtures.mjs'], { cwd: './', stdio: 'inherit', shell: true })
  setTimeout(loadAndDraw, 500)
})

sel.value = fixtures[0]
loadAndDraw()
