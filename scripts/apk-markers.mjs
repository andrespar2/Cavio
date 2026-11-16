import { chromium } from 'playwright-core'

const browser = await chromium.connectOverCDP('http://localhost:9223')
const context = browser.contexts()[0]
const page = context.pages()[0]
const data = await page.evaluate(() =>
  [...document.querySelectorAll('.leaflet-marker-icon')].map((el) => ({
    html: el.innerHTML.slice(0, 500),
    cls: el.className,
  })),
)
console.log(JSON.stringify(data, null, 2))
await browser.close()
