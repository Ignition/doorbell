import { test, expect } from './fixtures'

test.describe('Doorbell App', () => {
  test('subscriber page loads and shows connection status', async ({ page }) => {
    await page.goto('/')

    // Check page title or main heading
    await expect(page.locator('h1')).toContainText('Doorbell')

    // Check connection status is visible
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible()
  })

  test('subscriber generates a shareable URL', async ({ page }) => {
    await page.goto('/')

    // Wait for URL input to have a value
    const urlInput = page.locator('[data-testid="share-url"]')
    await expect(urlInput).toBeVisible()

    // URL should contain the ring path with a token
    await expect(urlInput).toHaveValue(/#\/ring\/[A-Za-z0-9_-]{43}/)
  })

  test('subscriber shows QR codes for ringers and subscribers', async ({ page }) => {
    await page.goto('/')

    // Should show two QR codes - one for ringers, one for subscribers
    const qrCodes = page.locator('[data-testid="qr-code"]')
    await expect(qrCodes).toHaveCount(2)
    await expect(qrCodes.first()).toBeVisible()
    await expect(qrCodes.nth(1)).toBeVisible()
  })

  test('publisher page loads with valid token', async ({ page }) => {
    // Generate a valid-looking token (43 chars base64url)
    const token = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN012'

    await page.goto(`/#/ring/${token}`)

    // Should show ring button
    await expect(page.locator('[data-testid="ring-button"]')).toBeVisible()
  })

  test('publisher page shows error with invalid token', async ({ page }) => {
    await page.goto('/#/ring/invalid-short-token')

    // Should show invalid link message
    await expect(page.locator('text=Invalid Link')).toBeVisible()
  })

  test('copy button works for ringer URL', async ({ page, context, browserName }) => {
    // Grant clipboard permissions (Chromium only - WebKit/Firefox don't support this)
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    }

    await page.goto('/')

    // Target the ringer share URL input specifically
    const urlInput = page.locator('[data-testid="share-url"]')
    await expect(urlInput).toBeVisible()

    // Get the URL value before clicking
    const shareUrl = await urlInput.inputValue()

    // Click the first Copy button (for ringer URL)
    const copyButton = page.locator('button:has-text("Copy")').first()
    await copyButton.click()

    // Verify clipboard contains the URL (Chromium only)
    if (browserName === 'chromium') {
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText())
      expect(clipboardContent).toBe(shareUrl)
    } else {
      // For WebKit/Firefox, just verify the button shows "Copied!" feedback
      await expect(page.locator('button:has-text("Copied!")').first()).toBeVisible()
    }
  })
})

test.describe('Cross-browser Doorbell Communication', () => {
  test('publisher can see ring button when visiting shared URL', async ({
    browser
  }) => {
    // Create subscriber context
    const subscriberContext = await browser.newContext()
    const subscriberPage = await subscriberContext.newPage()

    await subscriberPage.goto('/')

    // Get the share URL
    const shareUrl = await subscriberPage
      .locator('[data-testid="share-url"]')
      .inputValue()

    // Create publisher context
    const publisherContext = await browser.newContext()
    const publisherPage = await publisherContext.newPage()

    // Extract the hash part and navigate
    const hashPart = shareUrl.split('#')[1]
    await publisherPage.goto(`/#${hashPart}`)

    // Publisher should see the ring button
    await expect(
      publisherPage.locator('[data-testid="ring-button"]')
    ).toBeVisible()

    await subscriberContext.close()
    await publisherContext.close()
  })
})
