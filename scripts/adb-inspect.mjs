import { chromium } from 'playwright-core'

// Conexión al navegador del dispositivo Android vía CDP (ADB forward tcp:9222).
const browser = await chromium.connectOverCDP('http://localhost:9222')
const contexts = browser.contexts()
console.log('contexts:', contexts.length)
const pages = contexts.flatMap((c) => c.pages())
console.log('pages:', pages.map((p) => p.url()))
const page = pages.find((p) => p.url().includes('localhost:5173')) ?? pages[0]
if (!page) {
  console.log('No page found')
  process.exit(0)
}
page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()))
page.on('pageerror', (err) => console.log('[pageerror]', err.message))
await page.reload({ waitUntil: 'networkidle' }).catch((error) => console.log('reload error', error.message))
console.log('url:', page.url())
console.log('title:', await page.title())
console.log('viewport:', await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, sw: document.documentElement.scrollWidth })))
console.log('bodyText:', (await page.evaluate(() => document.body.innerText)).slice(0, 500))
console.log('rootHTML:', (await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 300)) ?? 'no root'))
await page.screenshot({ path: 'shots/adb-page.png' })
await browser.close()
