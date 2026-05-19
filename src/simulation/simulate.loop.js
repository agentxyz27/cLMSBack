/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              CLMS — Local Simulation Loop                              ║
 * ║              node simulation/simulate.loop.js                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Replaces n8n for local development.
 * Fires random student sessions every 2 minutes automatically.
 *
 * Run:
 *   node simulation/simulate.loop.js
 *
 * Stop:
 *   Ctrl+C
 *
 * Make sure your backend is running first:
 *   npm run dev
 */

const http = require('http')

// ── Config — matches your seed.simulate.js output ─────────────────────────
const CONFIG = {
  backendUrl: 'http://localhost:5000',
  intervalMs: 2 * 60 * 1000, // 2 minutes — change to 10000 for faster testing
  sessionsPerTick: 2,
  classrooms: [
    {
      id: 3,
      studentIds: Array.from({ length: 20 }, (_, i) => i + 10), // 10–29 Ichigo
      lessonIds: [21, 22, 23],
    },
    {
      id: 4,
      studentIds: Array.from({ length: 20 }, (_, i) => i + 30), // 30–49 Aizen
      lessonIds: [24, 25],
    },
  ],
  profileWeights: {
    at_risk:  0.30,
    average:  0.50,
    advanced: 0.20,
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pickProfile() {
  const r = Math.random()
  if (r < CONFIG.profileWeights.at_risk) return 'at_risk'
  if (r < CONFIG.profileWeights.at_risk + CONFIG.profileWeights.average) return 'average'
  return 'advanced'
}

function rndItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function timestamp() {
  return new Date().toLocaleTimeString('en-PH', { hour12: false })
}

// ── HTTP POST ──────────────────────────────────────────────────────────────

function postSession(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const url  = new URL('/simulate/session', CONFIG.backendUrl)

    const options = {
      hostname: url.hostname,
      port:     url.port || 5000,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ── Tick ───────────────────────────────────────────────────────────────────

async function tick() {
  console.log(`\n[${timestamp()}] ⏱  Tick — firing ${CONFIG.sessionsPerTick} session(s)...`)

  for (let i = 0; i < CONFIG.sessionsPerTick; i++) {
    const classroom = rndItem(CONFIG.classrooms)
    const studentId = rndItem(classroom.studentIds)
    const lessonId  = rndItem(classroom.lessonIds)
    const profile   = pickProfile()

    try {
      const { status, body } = await postSession({ studentId, lessonId, profile })

      if (status === 200 && body.success) {
        const s    = body.simulation
        const r    = body.results
        const snap = body.snapshot
        console.log(
          `  ✓ [${s.profile.padEnd(8)}] ${s.studentName.padEnd(20)}` +
          ` | ${s.lessonTitle.padEnd(38)}` +
          ` | MPS: ${String(r.mps).padStart(6)}%` +
          ` | isAtRisk: ${snap ? String(snap.isAtRisk).padEnd(5) : 'pending'}` +
          ` | XP: +${r.xpEarned}`
        )
      } else if (status === 409) {
        console.log(`  ↷  Student ${studentId} / Lesson ${lessonId} — already completed, skipping`)
      } else {
        console.log(`  ✗  [${status}] Student ${studentId} / Lesson ${lessonId} — ${body.error || 'unknown error'}`)
      }
    } catch (err) {
      console.error(`  ✗  Request failed: ${err.message}`)
      console.error(`     Is your backend running? (npm run dev)`)
    }
  }
}

// ── Start ──────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║         CLMS Simulation Loop — Started                  ║')
console.log('╠══════════════════════════════════════════════════════════╣')
console.log(`║  Backend    : ${CONFIG.backendUrl.padEnd(43)}║`)
console.log(`║  Interval   : every ${String(CONFIG.intervalMs / 1000 / 60).padEnd(2)} minute(s)                        ║`)
console.log(`║  Per tick   : ${String(CONFIG.sessionsPerTick).padEnd(2)} session(s)                           ║`)
console.log(`║  Classrooms : ${String(CONFIG.classrooms.length).padEnd(2)} (Ichigo + Aizen)                    ║`)
console.log('╠══════════════════════════════════════════════════════════╣')
console.log('║  Press Ctrl+C to stop                                   ║')
console.log('╚══════════════════════════════════════════════════════════╝')

// Fire once immediately, then on interval
tick()
setInterval(tick, CONFIG.intervalMs)