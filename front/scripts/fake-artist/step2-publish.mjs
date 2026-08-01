// Finishes artist publication: cover, confirm checkbox, publish
import { browserAsMaria, BASE, shot } from './session.mjs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const { browser, context } = await browserAsMaria()
const p = await context.newPage()
p.setDefaultTimeout(15000)
const log = (...a) => console.log('[publish]', ...a)

await p.goto(BASE + '/add-artist', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
log('url:', p.url(), '| draft восстановился?')
await shot(p, 'b1-reopen')

// если мастер вернул на шаг 4 — идём туда по сайдбару, иначе прокликиваем «Продолжить»
for (let i = 0; i < 4; i++) {
  const onConfirm = await p.$('text=Опубликовать профиль')
  if (onConfirm) break
  const next = await p.$('button.aw-footer__next')
  if (!next) break
  await next.click()
  await p.waitForTimeout(1200)
}
await shot(p, 'b2-step4')

// обложка профиля
const covers = await p.$$('input[type="file"]')
if (covers.length) {
  await covers[covers.length - 1].setInputFiles(resolve(DIR, 'out/teply-shum.jpg'))
  log('cover uploaded')
  await p.waitForTimeout(3500)
}

// галочка подтверждения
const cb = await p.$('input[type="checkbox"]')
if (cb) { await cb.check(); log('confirm checked') }

await shot(p, 'b3-before-publish')
await p.click('button.aw-footer__finish')
log('clicked publish')
await p.waitForTimeout(6000)
await shot(p, 'b4-published')
log('final url:', p.url())

await browser.close()
