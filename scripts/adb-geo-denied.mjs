import { chromium } from 'playwright-core'

const browser = await chromium.connectOverCDP('http://localhost:9222')
const context = browser.contexts()[0]
const page = context.pages().find((p) => p.url().includes('localhost:5173'))
const session = await context.newCDPSession(page)
await session.send('Emulation.setAutoDarkModeOverride', { enabled: false }).catch(() => {})

// Cerrar cualquier modal abierto y volver al inicio del pasajero.
await page.goto('http://localhost:5173/pasajero', { waitUntil: 'networkidle' })

// Denegar geolocalización a nivel de navegador.
await session.send('Browser.setPermission', {
  permission: { name: 'geolocation' },
  setting: 'denied',
  origin: 'http://localhost:5173',
}).catch((e) => console.log('permission error', e.message))

await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
const state = await page.evaluate(() => ({
  denied: document.body.innerText.includes('Ubicación no disponible'),
  demo: document.body.innerText.includes('Usar ubicación DEMO'),
  insecure: document.body.innerText.includes('requiere HTTPS'),
  origin: [...document.querySelectorAll('button')].find((b) => b.innerText.includes('ORIGEN'))?.innerText,
}))
console.log('denied state:', state)
await page.screenshot({ path: 'shots/adb-06-geo-denied.png', fullPage: true })

// Alternativa manual: usar ubicación DEMO
const demoButton = page.getByRole('button', { name: /Usar ubicación DEMO/i }).first()
if (await demoButton.count()) {
  await demoButton.click()
  await page.waitForTimeout(500)
  const demoState = await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('ORIGEN'))?.innerText)
  console.log('demo origin:', demoState)
  await page.screenshot({ path: 'shots/adb-07-geo-demo.png' })
}

// Restaurar permiso concedido para las pruebas restantes.
await session.send('Browser.setPermission', {
  permission: { name: 'geolocation' },
  setting: 'granted',
  origin: 'http://localhost:5173',
}).catch(() => {})
await browser.close()
