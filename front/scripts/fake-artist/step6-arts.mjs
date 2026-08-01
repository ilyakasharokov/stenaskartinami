// v2: fills the required Artist autocomplete (Maria) and submits each artwork
import { browserAsMaria, BASE, shot } from './session.mjs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))

const ARTS = [
  { file: 'severnoe-utro.jpg', title: 'Северное утро', materials: 'Холст, акрил', w: '80', h: '100', price: '48000',
    desc: 'Балтийское утро, разобранное на плоскости холодного света и одинокое тёплое солнце. Геометрия города растворяется в тумане залива.',
    styles: ['Абстракционизм'], subjects: ['Пейзаж'], mediums: ['Акрил'] },
  { file: 'teply-shum.jpg', title: 'Тёплый шум', materials: 'Холст, масло', w: '90', h: '70', price: '52000',
    desc: 'Тёплая абстракция о городском гуле: наслоения охры и терракоты, круги как отголоски звуков, уходящие в глубокую тень у нижнего края.',
    styles: ['Абстракционизм'], subjects: ['Абстракция'], mediums: ['Масло'] },
  { file: 'tishina-3.jpg', title: 'Тишина №3', materials: 'Холст, акрил', w: '75', h: '95', price: '39000',
    desc: 'Минималистичная композиция из трёх элементов: рамка, тёмная плоскость и единственный красный акцент — попытка изобразить паузу.',
    styles: ['Минимализм'], subjects: ['Абстракция'], mediums: ['Акрил'] },
]

async function fillCombo(p, comboEl, values) {
  for (const v of values) {
    await comboEl.click(); await comboEl.fill(v); await p.waitForTimeout(900)
    const opt = await p.$('.multi-select__option, [class*="option"]')
    if (opt) await opt.click().catch(() => p.keyboard.press('Enter'))
    else await p.keyboard.press('Enter')
    await p.waitForTimeout(400)
  }
}

async function uploadOne(p, art, idx) {
  await p.goto(BASE + '/account/add-art', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  await (await p.$('input[type="file"]')).setInputFiles(resolve(DIR, 'out/' + art.file))
  await p.waitForTimeout(3500)
  let c = await p.$('button:has-text("Продолжить")')
  if (c && !(await c.isDisabled().catch(() => false))) { await c.click(); await p.waitForTimeout(3000) }

  await p.fill('input[placeholder*="Осенний пейзаж"]', art.title)

  // Required Artist autocomplete → pick Maria
  const artistInput = await p.$('input[placeholder="Малевич"]')
  await artistInput.click(); await artistInput.fill('Мария Лебедева')
  await p.waitForTimeout(1500)
  const opt = await p.$('.form-input__option')
  if (opt) { await opt.click(); console.log(`  [${art.title}] artist picked`) }
  else console.log(`  [${art.title}] !! no artist suggestion for "Мария Лебедева"`)
  await p.waitForTimeout(500)

  const mat = await p.$('input[placeholder="Холст, масло"]'); if (mat) await mat.fill(art.materials)
  const wI = await p.$('input[placeholder="80"]'); if (wI) await wI.fill(art.w)
  const hI = await p.$('input[placeholder="100"]'); if (hI) await hI.fill(art.h)
  const desc = await p.$('textarea'); if (desc) await desc.fill(art.desc)
  const combos = await p.$$('input[placeholder="Поиск или свой вариант…"]')
  if (combos[0]) await fillCombo(p, combos[0], art.styles)
  if (combos[1]) await fillCombo(p, combos[1], art.subjects)
  if (combos[2]) await fillCombo(p, combos[2], art.mediums)
  const priceI = await p.$('input[placeholder="15000"]'); if (priceI) await priceI.fill(art.price)
  await p.waitForTimeout(500)
  await shot(p, `f${idx}-details`)

  // Continue → step 3
  const c2 = await p.$('button:has-text("Продолжить")')
  if (c2) { await c2.click(); await p.waitForTimeout(2500) }
  await shot(p, `f${idx}-step3`)

  // Submit for moderation
  const submit = await p.$('button:has-text("модерац"), button:has-text("Опубликовать"), button:has-text("Отправить"), button:has-text("Готово")')
  if (submit) { await submit.click(); console.log(`  [${art.title}] submitted`); await p.waitForTimeout(4500) }
  else console.log(`  [${art.title}] !! no submit button on step 3`)
  await shot(p, `f${idx}-done`)
  console.log(`  [${art.title}] url:`, p.url())
}

const { browser, context } = await browserAsMaria()
const p = await context.newPage()
p.setDefaultTimeout(20000)
p.on('dialog', d => d.accept().catch(() => {}))
let i = 1
for (const art of ARTS) {
  try { await uploadOne(p, art, i) } catch (e) { console.log(`  [${art.title}] ERROR:`, e.message.split('\n')[0]); await shot(p, `f${i}-error`) }
  i++
}
await browser.close()
