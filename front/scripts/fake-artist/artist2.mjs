// Register + profile + 3 artworks (AI paintings, 3 photos each) for a 2nd artist.
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const AI = resolve(DIR, 'ai-out')
const BASE = 'https://stenaskartinami.com'
const API = 'https://api.stenaskartinami.com/api'
const EMAIL = 'artem.severov.ekb@example.com'
const PASSWORD = 'Severov2026!Art'
const f = (n) => resolve(AI, n)

async function register() {
  const r = await fetch(`${API}/auth/local/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'artem_severov', email: EMAIL, password: PASSWORD }),
  })
  const j = await r.json()
  console.log('register:', j.jwt ? 'OK id=' + j.user.id : (j.error?.message || 'exists?'))
}

async function login() {
  const jar = {}
  const setC = res => { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1) } }
  const hdr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
  let r = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: hdr() } }); setC(r)
  const { csrfToken } = await r.json()
  r = await fetch(`${BASE}/api/auth/callback/credentials`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: hdr() }, body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: BASE, json: 'true' }) }); setC(r)
  const name = jar['__Secure-next-auth.session-token'] ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
  if (!jar[name]) throw new Error('login failed: ' + Object.keys(jar).join(','))
  return [{ name, value: jar[name], domain: new URL(BASE).hostname, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]
}

const ARTS = [
  { title: 'Полдень в саду', files: ['sev-polden-1', 'sev-polden-2', 'sev-polden-3'], materials: 'Холст, масло', w: '100', h: '80', price: '55000', styles: ['Импрессионизм'], subjects: ['Пейзаж'], mediums: ['Масло'], desc: 'Летний сад в полуденном свете: рыхлые импрессионистские мазки, тёплая охра и зелень, дрожащий воздух над травой.' },
  { title: 'Ржавое эхо', files: ['sev-eho-1', 'sev-eho-2', 'sev-eho-3'], materials: 'Холст, масло', w: '90', h: '90', price: '47000', styles: ['Абстракционизм'], subjects: ['Абстракция'], mediums: ['Масло'], desc: 'Разъеденная охра и железная ржавчина, фактурные наслоения — эхо промышленного распада и времени.' },
  { title: 'Балтийский туман', files: ['sev-tuman-1', 'sev-tuman-2', 'sev-tuman-3'], materials: 'Холст, масло', w: '80', h: '100', price: '61000', styles: ['Абстракционизм'], subjects: ['Пейзаж'], mediums: ['Масло'], desc: 'Холодный серо-голубой туман над водой, формы растворяются мастихином — тишина северного побережья.' },
]

async function fillCombo(p, el, values) {
  for (const v of values) { await el.click(); await el.fill(v); await p.waitForTimeout(900); const o = await p.$('.multi-select__option, [class*="option"]'); if (o) await o.click().catch(() => p.keyboard.press('Enter')); else await p.keyboard.press('Enter'); await p.waitForTimeout(400) }
}

async function uploadArt(p, art) {
  await p.goto(BASE + '/account/add-art', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  await (await p.$('input[type="file"]')).setInputFiles(art.files.map(n => f(n + '.jpg')))
  await p.waitForTimeout(4500)
  let c = await p.$('button:has-text("Продолжить")'); if (c && !(await c.isDisabled().catch(() => false))) { await c.click(); await p.waitForTimeout(3000) }
  await p.fill('input[placeholder*="Осенний пейзаж"]', art.title)
  const ai = await p.$('input[placeholder="Малевич"]'); await ai.click(); await ai.fill('Артём Северов'); await p.waitForTimeout(1500)
  const opt = await p.$('.form-input__option'); if (opt) await opt.click()
  await p.waitForTimeout(400)
  const mat = await p.$('input[placeholder="Холст, масло"]'); if (mat) await mat.fill(art.materials)
  const wI = await p.$('input[placeholder="80"]'); if (wI) await wI.fill(art.w)
  const hI = await p.$('input[placeholder="100"]'); if (hI) await hI.fill(art.h)
  const d = await p.$('textarea'); if (d) await d.fill(art.desc)
  const combos = await p.$$('input[placeholder="Поиск или свой вариант…"]')
  if (combos[0]) await fillCombo(p, combos[0], art.styles)
  if (combos[1]) await fillCombo(p, combos[1], art.subjects)
  if (combos[2]) await fillCombo(p, combos[2], art.mediums)
  const pr = await p.$('input[placeholder="15000"]'); if (pr) await pr.fill(art.price)
  await p.waitForTimeout(400)
  const c2 = await p.$('button:has-text("Продолжить")'); if (c2) { await c2.click(); await p.waitForTimeout(2500) }
  const sb = await p.$('button:has-text("модерац"), button:has-text("Опубликовать"), button:has-text("Отправить"), button:has-text("Готово")'); if (sb) { await sb.click(); await p.waitForTimeout(4000) }
  console.log(`  «${art.title}» отправлена`)
}

// ── run ──
await register()
const cookies = await login()
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addCookies(cookies)
const p = await ctx.newPage()
p.setDefaultTimeout(20000)
p.on('dialog', d => d.accept().catch(() => {}))

// warm auto-nothing; go to profile wizard
await p.goto(BASE + '/add-artist', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
await p.fill('input[placeholder*="Кандинский"]', 'Артём Северов')
await p.fill('input[placeholder="Если есть"]', 'Severov')
await (await p.$('input[type="file"]')).setInputFiles(f('sev-tuman-1.jpg'))
await p.waitForTimeout(3500)
const city = await p.$('input[placeholder*="Москва"]'); await city.fill('Екатеринбург'); await p.waitForTimeout(2500); await p.keyboard.press('Escape')
for (const s of ['Импрессионизм', 'Абстракционизм', 'Постимпрессионизм']) { const chip = await p.$(`text="${s}"`); if (chip) await chip.click() }
const years = await p.$$('input[placeholder="Год"]'); if (years[0]) await years[0].fill('1985'); if (years[1]) await years[1].fill('2009')
await p.click('button.aw-footer__next'); await p.waitForTimeout(1500)
const tas = await p.$$('textarea'); if (tas[0]) await tas[0].fill('Художник из Екатеринбурга. Пишу маслом на стыке импрессионизма и абстракции: уральские пейзажи, промышленная фактура, свет сквозь дым и туман. Окончил Уральский архитектурно-художественный университет (2009). Участник региональных и московских выставок, работы в частных собраниях.')
const edu = await p.$('input[placeholder*="бразован" i], textarea[placeholder*="бразован" i]'); if (edu) await edu.fill('УрГАХУ, живопись, 2009')
await p.click('button.aw-footer__next'); await p.waitForTimeout(1500)
const tg = await p.$('input[placeholder*="елеграм" i], input[placeholder*="@" i]'); if (tg) await tg.fill('@severov_art')
await p.click('button.aw-footer__next'); await p.waitForTimeout(1500)
const fileInputs = await p.$$('input[type="file"]'); if (fileInputs.length) { await fileInputs[fileInputs.length - 1].setInputFiles(f('sev-polden-1.jpg')); await p.waitForTimeout(3500) }
const cb = await p.$('input[type="checkbox"]'); if (cb) await cb.check()
const pub = await p.$('button.aw-footer__finish') || await p.$('text=Опубликовать профиль'); await pub.click(); await p.waitForTimeout(6000)
console.log('профиль опубликован:', p.url())

for (const art of ARTS) { try { await uploadArt(p, art) } catch (e) { console.log('  ✗', art.title, e.message.split('\n')[0]) } }

await browser.close()
