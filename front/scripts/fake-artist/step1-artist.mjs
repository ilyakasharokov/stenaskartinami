// Walks the /add-artist wizard as Maria (prod), screenshotting each step
import { browserAsMaria, BASE, shot } from './session.mjs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const { browser, context } = await browserAsMaria()
const p = await context.newPage()
p.setDefaultTimeout(15000)

const log = (...a) => console.log('[artist]', ...a)

await p.goto(BASE + '/add-artist', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
await shot(p, 'a1-step1-empty')
log('step1 opened:', p.url())

// ── Шаг 1: основная информация ──
await p.fill('input[placeholder*="Кандинский"]', 'Мария Лебедева')
await p.fill('input[placeholder="Если есть"]', 'Lebedeva')

// аватар
const avatarInput = await p.$('input[type="file"]')
if (avatarInput) {
  await avatarInput.setInputFiles(resolve(DIR, 'out/tishina-3.jpg'))
  log('avatar uploaded')
  await p.waitForTimeout(2500)
}

// город (страна уже «Россия»)
const city = await p.$('input[placeholder*="Москва"]')
if (city) {
  await city.fill('Санкт-Петербург')
  await p.waitForTimeout(2500) // ждём подсказки Nominatim
  const sug = await p.$('.addr-suggestions div, .addr-suggest, [class*="suggest"] >> nth=0')
  if (sug) { await sug.click(); log('city picked from suggestions') }
  else log('city typed (no suggestions)')
}

// стили
for (const s of ['Абстракционизм', 'Минимализм', 'Супрематизм']) {
  const chip = await p.$(`text="${s}"`)
  if (chip) { await chip.click(); log('style:', s) }
}

// годы
const years = await p.$$('input[placeholder="Год"]')
if (years[0]) await years[0].fill('1989')
if (years[1]) await years[1].fill('2015')

await p.waitForTimeout(800)
await shot(p, 'a2-step1-filled')

// дальше
await p.click('button.aw-footer__next')
await p.waitForTimeout(1500)
await shot(p, 'a3-step2')
log('on step 2:', await p.$eval('.aw-step__title, h1, .aw-artist-title', el => el.textContent).catch(() => '?'))

// ── Шаг 2: биография ── (заполняем все textarea по порядку)
const tas = await p.$$('textarea')
log('textareas on step2:', tas.length)
if (tas[0]) await tas[0].fill('Художница из Санкт-Петербурга. Работаю на стыке геометрической абстракции и северного пейзажа: строгие плоскости цвета, приглушённый свет Балтики и одинокие тёплые акценты. Окончила СПбГХПА им. Штиглица (2013). С 2015 года участвую в групповых выставках в Петербурге и Москве. Картины находятся в частных коллекциях в России и Европе.')
if (tas[1]) await tas[1].fill('СПбГХПА им. А. Л. Штиглица, монументально-декоративная живопись, 2013')
if (tas[2]) await tas[2].fill('2019 — «Плоскость света», галерея «Свиное рыло», Санкт-Петербург\n2022 — групповая выставка «Север внутри», ЦТИ Фабрика, Москва')
await shot(p, 'a4-step2-filled')

await p.click('button.aw-footer__next')
await p.waitForTimeout(1500)
await shot(p, 'a5-step3')

// ── Шаг 3: соцсети/контакты — пропускаем необязательное, но телега пусть будет ──
const tg = await p.$('input[placeholder*="елеграм" i], input[placeholder*="@"]')
if (tg) await tg.fill('@lebedeva_art')
await shot(p, 'a6-step3-filled')

await p.click('button.aw-footer__next')
await p.waitForTimeout(1500)
await shot(p, 'a7-step4')

// ── Шаг 4: подтверждение/публикация ──
const finish = await p.$('button.aw-footer__finish')
if (finish) {
  await finish.click()
  log('clicked finish')
  await p.waitForTimeout(4000)
  await shot(p, 'a8-after-submit')
  log('final url:', p.url())
} else {
  log('no finish button — check a7 screenshot')
}

await browser.close()
