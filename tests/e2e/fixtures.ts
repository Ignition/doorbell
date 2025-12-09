import { test as base, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Extend the base test to collect coverage
export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page)

    // After test, collect coverage if available
    const coverage = await page.evaluate(() => {
      return (window as unknown as { __coverage__?: object }).__coverage__
    })

    if (coverage) {
      const nycOutput = path.join(process.cwd(), '.nyc_output')
      if (!fs.existsSync(nycOutput)) {
        fs.mkdirSync(nycOutput, { recursive: true })
      }

      const coverageFile = path.join(
        nycOutput,
        `coverage-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
      )
      fs.writeFileSync(coverageFile, JSON.stringify(coverage))
    }
  }
})

export { expect }
