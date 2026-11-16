import { chromium } from 'playwright-core'

const browser = await chromium.connectOverCDP('http://localhost:9222')
const context = browser.contexts()[0]
const page = context.pages().find((p) => p.url().includes('localhost:5173'))
const session = await context.newCDPSession(page)
await session.send('Emulation.setAutoDarkModeOverride', { enabled: false }).catch(() => {})

await page.getByRole('button', { name: /Destino/ }).first().click()
await page.waitForTimeout(500)
const input = page.getByPlaceholder('Buscar dirección, lugar o zona…')
await input.click()
await input.fill('Unicentro')
await page.waitForTimeout(800)
console.log('keyboard/focus ok')
await browser.close()
