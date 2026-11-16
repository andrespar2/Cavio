import { chromium } from 'playwright-core'

const browser = await chromium.connectOverCDP('http://localhost:9222')
const page = browser.contexts()[0].pages().find((p) => p.url().includes('localhost:5173'))
if (!page) {
  console.log('no page')
  process.exit(1)
}
try {
  console.log('viewport', await page.evaluate(() => `${innerWidth}x${innerHeight} dpr ${devicePixelRatio}`))
  await page.screenshot({ path: 'shots/adb-page.png', timeout: 30000 })
  console.log('screenshot ok')
} catch (error) {
  console.log('screenshot failed:', error.message)
}
await browser.close()
