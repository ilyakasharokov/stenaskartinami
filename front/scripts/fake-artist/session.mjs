// Logs Maria in via NextAuth credentials and saves a Playwright storageState
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
export const BASE = process.env.FA_BASE || 'https://stenaskartinami.com'
const EMAIL = 'maria.lebedeva.spb@example.com'
const PASSWORD = 'Lebedeva2026!Art'

export async function login() {
  const jar = {}
  const setCookies = res => {
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

  r = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: BASE, json: 'true' }),
  })
  setCookies(r)

  const name = jar['__Secure-next-auth.session-token'] ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
  if (!jar[name]) throw new Error('login failed — no session token; keys: ' + Object.keys(jar).join(','))
  const url = new URL(BASE)
  return [{ name, value: jar[name], domain: url.hostname, path: '/', httpOnly: true, secure: url.protocol === 'https:', sameSite: 'Lax' }]
}

export async function browserAsMaria() {
  const cookies = await login()
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addCookies(cookies)
  return { browser, context }
}

export const shot = (page, name) => page.screenshot({ path: resolve(DIR, 'out', name + '.png') })

// standalone check
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { browser, context } = await browserAsMaria()
  const p = await context.newPage()
  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  const s = await p.evaluate(() => fetch('/api/auth/session').then(r => r.json()))
  console.log('session:', s?.user?.name || s?.user?.email || 'NONE', '| info id:', s?.info?.id)
  await browser.close()
}
