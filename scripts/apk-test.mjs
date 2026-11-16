import { chromium } from 'playwright-core'

const browser = await chromium.connectOverCDP('http://localhost:9223')
const context = browser.contexts()[0]
const page = context.pages().find((p) => p.url().includes('localhost')) ?? context.pages()[0]
console.log('pages:', context.pages().map((p) => p.url()))
console.log('viewport:', await page.evaluate(() => `${innerWidth}x${innerHeight} dpr ${devicePixelRatio}`))
console.log('title:', await page.title())

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('ERR_INTERNET_DISCONNECTED')) errors.push(`console: ${m.text()}`)
})

await page.getByRole('button', { name: /Probar como pasajero/i }).click()
await page.waitForTimeout(1500)
console.log('route after tap:', page.url())
await page.screenshot({ path: 'shots/apk-02-passenger.png' })

// Abrir selector de destino y buscar
await page.getByRole('button', { name: /Destino ¿A dónde/ }).click()
await page.waitForTimeout(400)
await page.getByPlaceholder('Buscar dirección, lugar o zona…').fill('Zona T')
await page.waitForTimeout(600)
await page.screenshot({ path: 'shots/apk-03-picker.png' })
await page.getByRole('button', { name: /^Zona T/ }).first().click()
await page.getByRole('button', { name: /Confirmar destino/i }).click()
await page.waitForTimeout(1200)
console.log('route ready, body has fare:', await page.evaluate(() => document.body.innerText.includes('Sugerida:')))
await page.screenshot({ path: 'shots/apk-04-route.png' })

// Tamaño de objetivos táctiles clave
const metrics = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')].filter((b) => b.offsetParent)
  const small = buttons
    .map((b) => ({ text: b.innerText.trim().slice(0, 24), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }))
    .filter((b) => b.h > 0 && (b.h < 36 || b.w < 36))
  return { total: buttons.length, smallTargets: small.slice(0, 12), sw: document.documentElement.scrollWidth, vw: innerWidth }
})
console.log('metrics:', JSON.stringify(metrics))
console.log('errors:', errors)
await browser.close()
