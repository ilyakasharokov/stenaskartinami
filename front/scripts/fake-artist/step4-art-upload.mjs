// Opens add-art wizard, uploads the painting, screenshots what comes next
import { browserAsMaria, BASE, shot } from './session.mjs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const { browser, context } = await browserAsMaria()
const p = await context.newPage()
p.setDefaultTimeout(20000)
const log = (...a) => console.log('[art]', ...a)

await p.goto(BASE + '/account/add-art', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
await shot(p, 'd1-upload-page')

const fi = await p.$('input[type="file"]')
await fi.setInputFiles(resolve(DIR, 'out/severnoe-utro.jpg'))
log('file set')
await p.waitForTimeout(4000)
await shot(p, 'd2-after-file')

// кнопка Продолжить после загрузки
const cont = await p.$('button:has-text("Продолжить")')
if (cont) {
  const disabled = await cont.isDisabled().catch(() => false)
  log('continue btn, disabled =', disabled)
  if (!disabled) { await cont.click(); await p.waitForTimeout(3000) }
}
await shot(p, 'd3-details')
log('url:', p.url())
// перечислю поля формы деталей
const fields = await p.$$eval('input, textarea, select', els => els.slice(0, 25).map(e => `${e.tagName.toLowerCase()}[${e.type || ''}] ph="${e.placeholder || ''}" name="${e.name || ''}"`))
console.log(fields.join('\n'))

await browser.close()
