import { chromium } from 'playwright-core'

const browser = await chromium.connectOverCDP('http://localhost:9222')
const page = browser.contexts()[0].pages().find((p) => p.url().includes('localhost:5173'))
const session = await page.context().newCDPSession(page)
try {
  await session.send('Emulation.setAutoDarkModeOverride', { enabled: false })
  console.log('auto dark override disabled')
} catch (error) {
  console.log('override failed', error.message)
}
await page.screenshot({ path: 'shots/adb-page-nodark.png', timeout: 30000 })
console.log('shot ok')
await browser.close()
