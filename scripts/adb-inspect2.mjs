import { chromium } from 'playwright-core'

const browser = await chromium.connectOverCDP('http://localhost:9222')
const page = browser.contexts()[0].pages().find((p) => p.url().includes('localhost:5173'))
const result = await page.evaluate(() => {
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Probar como pasajero'))
  const cta = document.querySelector('.bg-lime')
  const body = getComputedStyle(document.body)
  const html = getComputedStyle(document.documentElement)
  return {
    buttonBg: button ? getComputedStyle(button).backgroundColor : null,
    buttonColor: button ? getComputedStyle(button).color : null,
    ctaBg: cta ? getComputedStyle(cta).backgroundColor : null,
    colorScheme: body.colorScheme,
    htmlColorScheme: html.colorScheme,
    forcedColors: matchMedia('(forced-colors: active)').matches,
    prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
    darkModeMeta: document.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ?? null,
    supportsDark: matchMedia('(prefers-color-scheme: dark)').media,
  }
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
