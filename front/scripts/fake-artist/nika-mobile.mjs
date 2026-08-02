// Register a 3rd artist (cosmic surrealism) and walk the FULL add-artist +
// add-art flow on a MOBILE viewport, screenshotting each step for an audit.
import { chromium, devices } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const AI = resolve(DIR, 'ai-out')
const OUT = resolve(DIR, 'mobile-out')
import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })
const BASE = 'https://stenaskartinami.com'
const API = 'https://api.stenaskartinami.com/api'
const EMAIL = 'nika.orlova.kzn@example.com', PW = 'Orlova2026!Art'
const f = n => resolve(AI, n + '.jpg')
const shot = (p, n) => p.screenshot({ path: resolve(OUT, n + '.png'), fullPage: true })

async function register() {
  const r = await fetch(`${API}/auth/local/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'nika_orlova', email: EMAIL, password: PW }) })
  const j = await r.json(); console.log('register:', j.jwt ? 'OK id=' + j.user.id : (j.error?.message || 'exists'))
}
async function login() {
  const jar = {}; const setC = res => { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1) } }
  const hdr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
  let r = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: hdr() } }); setC(r)
  const { csrfToken } = await r.json()
  r = await fetch(`${BASE}/api/auth/callback/credentials`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: hdr() }, body: new URLSearchParams({ csrfToken, email: EMAIL, password: PW, callbackUrl: BASE, json: 'true' }) }); setC(r)
  const name = jar['__Secure-next-auth.session-token'] ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
  return [{ name, value: jar[name], domain: new URL(BASE).hostname, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]
}

const ARTS = [
  { title: 'Сон о невесомости', files: ['nika-nevesomost-1', 'nika-nevesomost-2', 'nika-nevesomost-3'], w: '70', h: '100', price: '58000', desc: 'Фигура в невесомости среди лун и туманностей — сон о свободе от притяжения. Глубокий индиго и фиолет, густой мазок.' },
  { title: 'Тихая орбита', files: ['nika-orbita-1', 'nika-orbita-2', 'nika-orbita-3'], w: '100', h: '70', price: '64000', desc: 'Планеты застыли над зеркальным морем на закате. Тёплое золото и холодный бирюзовый, тишина космической орбиты.' },
  { title: 'Внутренний космос', files: ['nika-vnutrenniy-1', 'nika-vnutrenniy-2', 'nika-vnutrenniy-3'], w: '90', h: '90', price: '49000', desc: 'Светящийся портал и облака туманности внутри сознания. Бирюза и маджента, геометрия и органика.' },
]

async function fillCombo(p, el, val) { await el.click(); await el.fill(val); await p.waitForTimeout(900); const o = await p.$('.multi-select__option, [class*="option"]'); if (o) await o.click().catch(() => p.keyboard.press('Enter')); else await p.keyboard.press('Enter'); await p.waitForTimeout(400) }

const issues = []
const chk = async (p, name, sel, label) => { const el = await p.$(sel); const vis = el ? await el.isVisible().catch(() => false) : false; if (!vis) issues.push(`[${name}] не видно/нет: ${label} (${sel})`) }

await register()
const cookies = await login()
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 12'] })
await ctx.addCookies(cookies)
const p = await ctx.newPage()
p.setDefaultTimeout(20000)
p.on('dialog', d => d.accept().catch(() => {}))

// ── ARTIST WIZARD (mobile) ──
await p.goto(BASE + '/add-artist', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
await shot(p, 'artist-1-step1')
await chk(p, 'artist-step1', 'button.aw-footer__next', 'кнопка Продолжить')
await chk(p, 'artist-step1', 'input[placeholder*="Кандинский"]', 'поле Имя')
await p.fill('input[placeholder*="Кандинский"]', 'Ника Орлова')
await p.fill('input[placeholder="Если есть"]', 'Orlova')
await (await p.$('input[type="file"]')).setInputFiles(f('nika-nevesomost-1'))
await p.waitForTimeout(3500)
const city = await p.$('input[placeholder*="Москва"]'); await city.fill('Казань'); await p.waitForTimeout(2500); await p.keyboard.press('Escape')
for (const s of ['Сюрреализм', 'Абстракционизм']) { const chip = await p.$(`text="${s}"`); if (chip) await chip.click() }
const years = await p.$$('input[placeholder="Год"]'); if (years[0]) await years[0].fill('1990'); if (years[1]) await years[1].fill('2014')
await shot(p, 'artist-2-step1-filled')
await p.click('button.aw-footer__next'); await p.waitForTimeout(1500)
await shot(p, 'artist-3-step2')
const tas = await p.$$('textarea'); if (tas[0]) await tas[0].fill('Художница из Казани. Пишу маслом космический сюрреализм: сны о невесомости, парящие планеты, внутренний космос. Окончила Казанское художественное училище им. Фешина (2014). Работы в частных собраниях России и Европы.')
const edu = await p.$('input[placeholder*="бразован" i], textarea[placeholder*="бразован" i]'); if (edu) await edu.fill('КХУ им. Н. И. Фешина, 2014')
await p.click('button.aw-footer__next'); await p.waitForTimeout(1500)
await shot(p, 'artist-4-step3')
const tg = await p.$('input[placeholder*="елеграм" i], input[placeholder*="@" i]'); if (tg) await tg.fill('@orlova_cosmos')
await p.click('button.aw-footer__next'); await p.waitForTimeout(1500)
await shot(p, 'artist-5-step4')
const fileInputs = await p.$$('input[type="file"]'); if (fileInputs.length) { await fileInputs[fileInputs.length - 1].setInputFiles(f('nika-orbita-1')); await p.waitForTimeout(3500) }
const cb = await p.$('input[type="checkbox"]'); if (cb) await cb.check()
await chk(p, 'artist-step4', 'button.aw-footer__finish', 'кнопка Опубликовать')
const pub = await p.$('button.aw-footer__finish') || await p.$('text=Опубликовать профиль'); await pub.click(); await p.waitForTimeout(6000)
await shot(p, 'artist-6-published')
console.log('профиль:', p.url())

// ── ADD ART WIZARD (mobile) — just the first artwork for the audit ──
const art = ARTS[0]
await p.goto(BASE + '/account/add-art', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
await shot(p, 'art-1-upload')
await chk(p, 'art-upload', 'input[type="file"]', 'загрузка файла')
await (await p.$('input[type="file"]')).setInputFiles(art.files.map(n => f(n)))
await p.waitForTimeout(4500)
await shot(p, 'art-2-uploaded')
let c = await p.$('button:has-text("Продолжить")'); if (c && !(await c.isDisabled().catch(() => false))) { await c.click(); await p.waitForTimeout(3000) }
await shot(p, 'art-3-details')
await chk(p, 'art-details', 'input[placeholder*="Осенний пейзаж"]', 'поле Название')
await chk(p, 'art-details', 'input[placeholder="15000"]', 'поле Цена')
await p.fill('input[placeholder*="Осенний пейзаж"]', art.title)
const ai = await p.$('input[placeholder="Малевич"]'); await ai.click(); await ai.fill('Ника Орлова'); await p.waitForTimeout(1500); const opt = await p.$('.form-input__option'); if (opt) await opt.click()
const mat = await p.$('input[placeholder="Холст, масло"]'); if (mat) await mat.fill('Холст, масло')
const wI = await p.$('input[placeholder="80"]'); if (wI) await wI.fill(art.w)
const hI = await p.$('input[placeholder="100"]'); if (hI) await hI.fill(art.h)
const d = await p.$('textarea'); if (d) await d.fill(art.desc)
const pr = await p.$('input[placeholder="15000"]'); if (pr) await pr.fill(art.price)
await shot(p, 'art-4-details-filled')
const c2 = await p.$('button:has-text("Продолжить")'); if (c2) { await c2.click(); await p.waitForTimeout(2500) }
const sb = await p.$('button:has-text("модерац"), button:has-text("Опубликовать"), button:has-text("Отправить"), button:has-text("Готово")'); if (sb) { await sb.click(); await p.waitForTimeout(4000) }
await shot(p, 'art-5-done')
console.log('картина отправлена')

console.log('\n=== MOBILE ISSUES ===')
if (issues.length) issues.forEach(i => console.log('  !', i)); else console.log('  критичных проблем доступности не найдено')

await browser.close()
