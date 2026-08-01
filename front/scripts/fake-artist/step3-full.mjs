// Full add-artist walkthrough in ONE session (draft is not persisted between visits)
import { browserAsMaria, BASE, shot } from './session.mjs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const { browser, context } = await browserAsMaria()
const p = await context.newPage()
p.setDefaultTimeout(20000)
const log = (...a) => console.log('[full]', ...a)

await p.goto(BASE + '/add-artist', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)

// ── Шаг 1 ──
await p.fill('input[placeholder*="Кандинский"]', 'Мария Лебедева')
await p.fill('input[placeholder="Если есть"]', 'Lebedeva')
await (await p.$('input[type="file"]')).setInputFiles(resolve(DIR, 'out/tishina-3.jpg'))
await p.waitForTimeout(3000)

const city = await p.$('input[placeholder*="Москва"]')
await city.fill('Санкт-Петербург')
await p.waitForTimeout(3000)
// подсказку НЕ кликаем (в прошлый раз город задвоился) — оставляем чистый текст
await p.keyboard.press('Escape')

for (const s of ['Абстракционизм', 'Минимализм', 'Супрематизм']) {
  const chip = await p.$(`text="${s}"`)
  if (chip) await chip.click()
}
const years = await p.$$('input[placeholder="Год"]')
if (years[0]) await years[0].fill('1989')
if (years[1]) await years[1].fill('2015')
await shot(p, 'c1-step1')
await p.click('button.aw-footer__next')
await p.waitForTimeout(1500)

// ── Шаг 2: биография ──
const tas = await p.$$('textarea')
if (tas[0]) await tas[0].fill('Художница из Санкт-Петербурга. Работаю на стыке геометрической абстракции и северного пейзажа: строгие плоскости цвета, приглушённый свет Балтики и одинокие тёплые акценты. Окончила СПбГХПА им. Штиглица (2013). С 2015 года участвую в групповых выставках в Петербурге и Москве. Картины находятся в частных коллекциях в России и Европе.')
// возможно образование/выставки — инпуты
const eduInput = await p.$('input[placeholder*="бразован" i], textarea[placeholder*="бразован" i]')
if (eduInput) await eduInput.fill('СПбГХПА им. А. Л. Штиглица, 2013')
await shot(p, 'c2-step2')
await p.click('button.aw-footer__next')
await p.waitForTimeout(1500)

// ── Шаг 3: соцсети ──
const tg = await p.$('input[placeholder*="елеграм" i], input[placeholder*="@" i]')
if (tg) await tg.fill('@lebedeva_art')
await shot(p, 'c3-step3')
await p.click('button.aw-footer__next')
await p.waitForTimeout(1500)

// ── Шаг 4: обложка + галочка + публикация ──
await shot(p, 'c4-step4')
const fileInputs = await p.$$('input[type="file"]')
if (fileInputs.length) {
  await fileInputs[fileInputs.length - 1].setInputFiles(resolve(DIR, 'out/teply-shum.jpg'))
  log('cover uploaded'); await p.waitForTimeout(3500)
}
const cb = await p.$('input[type="checkbox"]')
if (cb) { await cb.check(); log('confirmed') }
await shot(p, 'c5-before-publish')

const publishBtn = await p.$('button.aw-footer__finish') || await p.$('text=Опубликовать профиль')
await publishBtn.click()
log('publish clicked')
await p.waitForTimeout(7000)
await shot(p, 'c6-result')
log('final url:', p.url())

await browser.close()
