import { chromium } from 'playwright-core'

const browser = await chromium.connectOverCDP('http://localhost:9222')
const context = browser.contexts()[0]
const page = context.pages().find((p) => p.url().includes('localhost:5173')) ?? context.pages()[0]
const session = await context.newCDPSession(page)
await session.send('Emulation.setAutoDarkModeOverride', { enabled: false }).catch(() => {})

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
console.log('landing:', await page.title(), await page.evaluate(() => `${innerWidth}x${innerHeight}`))
await page.screenshot({ path: 'shots/adb-01-landing.png' })

await page.getByRole('button', { name: /Probar como pasajero/i }).click()
await page.waitForURL('**/pasajero')
await page.waitForTimeout(1200)
console.log('passenger:', page.url())
await page.screenshot({ path: 'shots/adb-02-passenger.png', fullPage: true })

// Ubicación emulada para probar el permiso y el flujo (el equipo no tiene GPS real).
await context.grantPermissions(['geolocation']).catch((e) => console.log('grant failed', e.message))
await context.setGeolocation({ latitude: 4.6768, longitude: -74.0487 }).catch((e) => console.log('geo failed', e.message))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const geoState = await page.evaluate(() => ({
  body: document.body.innerText.includes('Mi ubicación actual'),
  origin: [...document.querySelectorAll('button')].map((b) => b.innerText).find((t) => t.includes('Origen')),
}))
console.log('geoState:', geoState)
await page.screenshot({ path: 'shots/adb-03-passenger-geo.png', fullPage: true })

// Abrir selector de destino y buscar por texto
await page.getByRole('button', { name: /Destino ¿A dónde/ }).click()
await page.waitForTimeout(500)
await page.getByPlaceholder('Buscar dirección, lugar o zona…').fill('Aeropuerto El Dorado')
await page.waitForTimeout(1200)
await page.screenshot({ path: 'shots/adb-04-picker.png' })
await page.getByRole('button', { name: /^Aeropuerto El Dorado/ }).first().click()
await page.getByRole('button', { name: /Confirmar destino/i }).click()
await page.waitForTimeout(2500)
const fareText = await page.evaluate(() => {
  const text = document.body.innerText
  const match = text.match(/Sugerida:\s*([^\n]+)/)
  return match?.[1] ?? null
})
console.log('suggested fare:', fareText)
await page.screenshot({ path: 'shots/adb-05-route.png', fullPage: true })

// Verificar tamaño de objetivos táctiles principales
const targets = await page.evaluate(() => {
  return [...document.querySelectorAll('button')]
    .filter((b) => b.offsetParent !== null)
    .map((b) => {
      const r = b.getBoundingClientRect()
      return { text: b.innerText.trim().slice(0, 34), w: Math.round(r.width), h: Math.round(r.height) }
    })
    .filter((b) => b.h > 0)
    .slice(0, 20)
})
console.log('targets:', JSON.stringify(targets))
console.log('errors:', errors)
await browser.close()
