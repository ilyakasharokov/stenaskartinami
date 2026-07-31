#!/usr/bin/env node
/**
 * site-check — smoke + visual QA agent.
 *
 * Opens key pages in a real (headless) browser, checks for hard failures
 * (bad HTTP status, JS/console errors, failed requests, broken images,
 * missing key blocks), then asks Claude Vision whether the layout looks OK.
 *
 * Usage:
 *   node scripts/site-check.mjs                 # full run (smoke + AI)
 *   CHECK_NO_AI=1 node scripts/site-check.mjs   # smoke only, no AI cost
 *   CHECK_BASE_URL=https://stenaskartinami.com node scripts/site-check.mjs
 *
 * Env (auto-read from front/.env if present):
 *   CHECK_BASE_URL   default http://localhost:3000
 *   CHECK_API_URL    default http://localhost:1337/api  (to resolve sample slugs)
 *   ANTHROPIC_API_KEY  required unless CHECK_NO_AI=1
 *   CHECK_MODEL      default claude-sonnet-4-6
 *   CHECK_EMAIL / CHECK_PASSWORD   login for auth-gated pages
 *                    (falls back to DEV_AUTO_EMAIL / DEV_AUTO_PASSWORD)
 *   CHECK_MIN_SCORE  AI score below this = fail (default 6)
 */

import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── load front/.env into process.env (without overriding real env) ──────────
function loadEnv(file) {
  const p = resolve(__dirname, '..', file)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (/^\s*#/.test(line)) continue
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    const key = m[1]
    const val = m[2].replace(/^["']|["']$/g, '')
    if (!val) continue
    if (process.env[key] === undefined) process.env[key] = val
  }
}
// .env.local wins over .env (loaded first — loader only sets undefined keys)
loadEnv('.env.local')
loadEnv('.env')

const BASE = (process.env.CHECK_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const API = (process.env.CHECK_API_URL || 'http://localhost:1337/api').replace(/\/$/, '')
const MODEL = process.env.CHECK_MODEL || 'claude-sonnet-4-6'
const MIN_SCORE = Number(process.env.CHECK_MIN_SCORE || 6)
const USE_AI = process.env.CHECK_NO_AI !== '1' && !!process.env.ANTHROPIC_API_KEY
const EMAIL = process.env.CHECK_EMAIL || process.env.DEV_AUTO_EMAIL
const PASSWORD = process.env.CHECK_PASSWORD || process.env.DEV_AUTO_PASSWORD
const OUT = resolve(__dirname, 'site-check-out')

// console-error noise we don't care about
const IGNORE_CONSOLE = [
  /favicon/i, /Failed to load resource.*favicon/i,
  /google|gtag|yandex|metrika|analytics/i,
  /ResizeObserver loop/i,
]
const IGNORE_REQFAIL = [/favicon/i, /analytics|metrika|gtag|mc\.yandex/i]

const j = (label, val) => `${label}=${val}`

// ── resolve real sample slugs from the API ──────────────────────────────────
async function sample(path, filter = '') {
  try {
    const r = await fetch(`${API}/${path}?pagination[pageSize]=1&fields[0]=slug${filter}`)
    const data = (await r.json())?.data?.[0]
    return data ? { slug: data.slug, id: data.id } : null
  } catch { return null }
}

async function buildRoutes() {
  const [art, artist, wall] = await Promise.all([
    sample('arts', '&filters[wall][$notNull]=true'),
    sample('artists'),
    sample('walls'),
  ])
  const pub = [
    { path: '/', tag: 'public', must: ['header', 'footer'] },
    { path: '/catalog', tag: 'public', must: ['footer'] },
    { path: '/artists', tag: 'public' },
    { path: '/walls', tag: 'public' },
    { path: '/about', tag: 'public' },
  ]
  if (art) pub.push({ path: `/art/${art.slug}--${art.id}`, tag: 'public', must: ['.favorite-btn'] })
  if (artist) pub.push({ path: `/artists/${artist.slug}--${artist.id}`, tag: 'public' })
  if (wall) pub.push({ path: `/walls/${wall.slug}--${wall.id}`, tag: 'public' })

  const auth = [
    { path: '/account/profile', tag: 'auth' },
    { path: '/add-art', tag: 'auth' },
    { path: '/add-wall', tag: 'auth' },
    { path: '/add-artist', tag: 'auth' },
    { path: '/moderator/artists', tag: 'moderator' },
    { path: '/moderator/campaigns', tag: 'moderator' },
  ]
  return { pub, auth }
}

// ── programmatic NextAuth credentials login → session cookie ─────────────────
async function login() {
  if (!EMAIL || !PASSWORD) return null
  const jar = {}
  const setCookies = (res) => {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [kv] = c.split(';')
      const i = kv.indexOf('=')
      jar[kv.slice(0, i)] = kv.slice(i + 1)
    }
  }
  const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')

  let r = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: cookieHeader() } })
  setCookies(r)
  const { csrfToken } = await r.json()

  const body = new URLSearchParams({
    csrfToken, email: EMAIL, password: PASSWORD,
    callbackUrl: BASE, json: 'true',
  })
  r = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookieHeader() },
    body,
  })
  setCookies(r)

  const token = jar['next-auth.session-token'] || jar['__Secure-next-auth.session-token']
  if (!token) return null
  const url = new URL(BASE)
  return [{
    name: jar['next-auth.session-token'] ? 'next-auth.session-token' : '__Secure-next-auth.session-token',
    value: token, domain: url.hostname, path: '/', httpOnly: true,
    secure: url.protocol === 'https:', sameSite: 'Lax',
  }]
}

// ── Claude Vision verdict on a screenshot ───────────────────────────────────
let anthropic = null
async function aiVerdict(pngBuffer, path) {
  if (!USE_AI) return null
  if (!anthropic) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  const prompt = `Ты — QA-инженер. На скриншоте страница "${path}" сайта-маркетплейса картин.
Оцени ТОЛЬКО визуальное состояние: сломанная вёрстка, наложения элементов, пустые/белые блоки,
обрезанный текст, невыровненные иконки, отсутствующие изображения, нечитаемые контрасты.
Не придирайся к контенту и вкусовщине. Ответь СТРОГО JSON без markdown:
{"score": <1-10>, "ok": <true|false>, "issues": ["коротко проблема", ...]}`
  try {
    const res = await anthropic.messages.create({
      model: MODEL, max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pngBuffer.toString('base64') } },
          { type: 'text', text: prompt },
        ],
      }],
    })
    const text = res.content.map(b => b.text || '').join('')
    const m = text.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : { score: null, ok: null, issues: ['AI: не удалось распарсить ответ'] }
  } catch (e) {
    return { score: null, ok: null, issues: ['AI error: ' + e.message] }
  }
}

// ── check one route ─────────────────────────────────────────────────────────
async function checkRoute(context, route) {
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  const failedReq = []
  page.on('console', m => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (!IGNORE_CONSOLE.some(re => re.test(t))) consoleErrors.push(t)
  })
  page.on('pageerror', e => pageErrors.push(e.message))
  page.on('response', res => {
    const s = res.status()
    if (s >= 400 && !IGNORE_REQFAIL.some(re => re.test(res.url()))) failedReq.push(`${s} ${res.url()}`)
  })

  const out = { ...route, status: null, redirectedTo: null, consoleErrors, pageErrors, failedReq, brokenImages: [], missing: [], ai: null, verdict: '?' }

  let resp
  try {
    resp = await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 25000 })
  } catch {
    try { resp = await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded', timeout: 25000 }) } catch {}
    await page.waitForTimeout(2500)
  }
  out.status = resp ? resp.status() : null
  const finalUrl = page.url()

  // auth gating
  if (finalUrl.includes('/auth/signin') && route.tag !== 'public') {
    out.redirectedTo = 'signin'; out.verdict = 'skip'
    await page.close(); return out
  }
  if (route.tag === 'moderator' && new URL(finalUrl).pathname === '/') {
    out.redirectedTo = 'home (не модератор)'; out.verdict = 'skip'
    await page.close(); return out
  }

  out.brokenImages = await page.$$eval('img', imgs =>
    imgs.filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).map(i => i.src)
  ).catch(() => [])

  for (const sel of route.must || []) {
    const found = await page.$(sel).catch(() => null)
    if (!found) out.missing.push(sel)
  }

  const shot = await page.screenshot({ fullPage: false }).catch(() => null) // above-the-fold
  if (shot) {
    mkdirSync(OUT, { recursive: true })
    const name = (route.path === '/' ? 'home' : route.path.replace(/[^\w]+/g, '_').replace(/^_|_$/g, ''))
    writeFileSync(resolve(OUT, name + '.png'), shot)
    await page.screenshot({ path: resolve(OUT, name + '.full.png'), fullPage: true }).catch(() => {})
    out.ai = await aiVerdict(shot, route.path)
  }

  const hardFail =
    (out.status && out.status >= 400) ||
    out.pageErrors.length > 0 ||
    out.brokenImages.length > 0 ||
    out.missing.length > 0 ||
    (out.ai && out.ai.score != null && out.ai.score < MIN_SCORE)
  out.verdict = hardFail ? 'fail' : (out.consoleErrors.length ? 'warn' : 'ok')

  await page.close()
  return out
}

// ── report ──────────────────────────────────────────────────────────────────
const ICON = { ok: '✓', warn: '~', fail: '✗', skip: '·', '?': '?' }
function line(r) {
  const parts = [
    `${ICON[r.verdict]} ${r.path.padEnd(34)}`,
    r.redirectedTo ? `→ ${r.redirectedTo}` : `HTTP ${r.status ?? '—'}`,
  ]
  if (!r.redirectedTo) {
    parts.push(j('console', r.consoleErrors.length))
    parts.push(j('jsErr', r.pageErrors.length))
    parts.push(j('req4xx', r.failedReq.length))
    parts.push(j('imgBroken', r.brokenImages.length))
    if (r.ai) parts.push(`AI ${r.ai.score ?? '?'}/10`)
  }
  return parts.join('   ')
}

async function main() {
  console.log(`\n▶ site-check → ${BASE}   (AI: ${USE_AI ? MODEL : 'off'})\n`)
  const { pub, auth } = await buildRoutes()

  const browser = await chromium.launch()
  const cookies = await login().catch(() => null)
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  if (cookies) { await context.addCookies(cookies); console.log('  ✓ авторизован как', EMAIL, '\n') }
  else console.log('  · без авторизации (auth-страницы будут пропущены)\n')

  const routes = cookies ? [...pub, ...auth] : pub
  const results = []
  for (const route of routes) {
    const r = await checkRoute(context, route)
    console.log('  ' + line(r))
    for (const iss of (r.ai?.issues || [])) console.log('      ! AI: ' + iss)
    for (const req of r.failedReq.slice(0, 3)) console.log('      ! ' + req)
    for (const e of r.pageErrors.slice(0, 2)) console.log('      ! JS: ' + e)
    if (r.missing.length) console.log('      ! нет блока: ' + r.missing.join(', '))
    results.push(r)
  }

  await browser.close()

  const fails = results.filter(r => r.verdict === 'fail')
  const warns = results.filter(r => r.verdict === 'warn')
  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(results, null, 2))

  console.log(`\n─────────────────────────────────────────`)
  console.log(`  ok: ${results.filter(r => r.verdict === 'ok').length}   warn: ${warns.length}   fail: ${fails.length}   skip: ${results.filter(r => r.verdict === 'skip').length}`)
  console.log(`  скриншоты и report.json → scripts/site-check-out/`)
  if (fails.length) {
    console.log(`\n  ✗ ПРОБЛЕМЫ на: ${fails.map(f => f.path).join(', ')}\n`)
    process.exit(1)
  }
  console.log(`\n  ✓ Всё выглядит в порядке\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
