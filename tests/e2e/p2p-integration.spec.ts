import { test, expect } from './fixtures'

/**
 * P2P Integration Tests
 *
 * These tests verify actual peer-to-peer communication between two browser contexts.
 * They exercise the P2P channel callbacks (onPeerJoin, onPeerLeave, onRing) that are
 * difficult to test in isolation.
 *
 * Note: P2P connection via BitTorrent DHT can take several seconds to establish.
 * These tests use longer timeouts to accommodate real network conditions.
 */
test.describe('P2P Integration', () => {
  test('subscriber and publisher can connect and ring', async ({ browser }) => {
    // Increase timeout for P2P connection
    test.setTimeout(60000)

    // Create subscriber context and page
    const subscriberContext = await browser.newContext()
    const subscriberPage = await subscriberContext.newPage()

    // Navigate to subscriber view
    await subscriberPage.goto('/')
    await expect(subscriberPage.locator('h1')).toContainText('Doorbell')

    // Wait for connection status to show connected
    await expect(subscriberPage.locator('[data-testid="connection-status"]')).toContainText(
      /connected/i,
      { timeout: 15000 }
    )

    // Get the share URL
    const shareUrl = await subscriberPage.locator('[data-testid="share-url"]').inputValue()
    expect(shareUrl).toMatch(/#\/ring\/[A-Za-z0-9_-]{43}/)

    // Create publisher context and page
    const publisherContext = await browser.newContext()
    const publisherPage = await publisherContext.newPage()

    // Navigate to publisher view using shared URL
    const hashPart = shareUrl.split('#')[1]
    await publisherPage.goto(`/#${hashPart}`)

    // Wait for ring button to be visible
    await expect(publisherPage.locator('[data-testid="ring-button"]')).toBeVisible()

    // Wait for publisher to connect (shows peer count or connected status)
    await expect(publisherPage.locator('[data-testid="connection-status"]')).toContainText(
      /connected/i,
      { timeout: 15000 }
    )

    // Wait for P2P connection to establish between the two peers
    // The subscriber should see peer count > 0 when publisher connects
    await expect(async () => {
      const statusText = await subscriberPage.locator('[data-testid="connection-status"]').textContent()
      // Check if peer count is shown (e.g., "1 peer" or "2 peers")
      expect(statusText).toMatch(/\d+\s*peer/i)
    }).toPass({ timeout: 30000 })

    // Ring the doorbell and wait for alert
    // Use retry pattern since P2P message delivery can be unreliable
    await expect(async () => {
      // Click ring button (may need multiple attempts for P2P delivery)
      await publisherPage.locator('[data-testid="ring-button"]').click()

      // Check if alert appeared
      await expect(subscriberPage.locator('[data-testid="doorbell-alert"]')).toBeVisible({
        timeout: 5000
      })
    }).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] })

    // Verify the alert shows "Doorbell!"
    await expect(subscriberPage.locator('[data-testid="doorbell-alert"]')).toContainText('Doorbell!')

    // Clean up
    await subscriberContext.close()
    await publisherContext.close()
  })

  test('subscriber shows peer count when publisher connects', async ({ browser }) => {
    test.setTimeout(45000)

    const subscriberContext = await browser.newContext()
    const subscriberPage = await subscriberContext.newPage()

    await subscriberPage.goto('/')

    // Initially should show 0 peers or just "connected"
    await expect(subscriberPage.locator('[data-testid="connection-status"]')).toContainText(
      /connected/i,
      { timeout: 15000 }
    )

    // Get share URL and connect publisher
    const shareUrl = await subscriberPage.locator('[data-testid="share-url"]').inputValue()

    const publisherContext = await browser.newContext()
    const publisherPage = await publisherContext.newPage()

    const hashPart = shareUrl.split('#')[1]
    await publisherPage.goto(`/#${hashPart}`)

    // Wait for publisher to be ready
    await expect(publisherPage.locator('[data-testid="ring-button"]')).toBeVisible()
    await expect(publisherPage.locator('[data-testid="connection-status"]')).toContainText(
      /connected/i,
      { timeout: 15000 }
    )

    // Subscriber should eventually show 1+ peers
    await expect(async () => {
      const statusText = await subscriberPage.locator('[data-testid="connection-status"]').textContent()
      expect(statusText).toMatch(/[1-9]\d*\s*peer/i)
    }).toPass({ timeout: 30000 })

    await subscriberContext.close()
    await publisherContext.close()
  })

  test('renaming doorbell updates subscriber history, publisher display, and publisher history', async ({
    browser
  }) => {
    test.setTimeout(60000)

    // Create subscriber context and page
    const subscriberContext = await browser.newContext()
    const subscriberPage = await subscriberContext.newPage()

    // Navigate to subscriber view
    await subscriberPage.goto('/')
    await expect(subscriberPage.locator('h1')).toContainText('Doorbell')

    // Wait for connection
    await expect(subscriberPage.locator('[data-testid="connection-status"]')).toContainText(
      /connected/i,
      { timeout: 15000 }
    )

    // Get the initial doorbell name
    const initialName = await subscriberPage.locator('[data-testid="doorbell-name"]').inputValue()
    expect(initialName).toBeTruthy()

    // Get the share URL and token
    const shareUrl = await subscriberPage.locator('[data-testid="share-url"]').inputValue()
    const token = shareUrl.match(/\/ring\/([A-Za-z0-9_-]{43})/)?.[1]
    expect(token).toBeTruthy()

    // Create publisher context and page
    const publisherContext = await browser.newContext()
    const publisherPage = await publisherContext.newPage()

    // Navigate to publisher view
    const hashPart = shareUrl.split('#')[1]
    await publisherPage.goto(`/#${hashPart}`)

    // Wait for publisher to connect
    await expect(publisherPage.locator('[data-testid="ring-button"]')).toBeVisible()
    await expect(publisherPage.locator('[data-testid="connection-status"]')).toContainText(
      /connected/i,
      { timeout: 15000 }
    )

    // Wait for P2P connection to establish (subscriber sees peer)
    await expect(async () => {
      const statusText = await subscriberPage
        .locator('[data-testid="connection-status"]')
        .textContent()
      expect(statusText).toMatch(/\d+\s*peer/i)
    }).toPass({ timeout: 30000 })

    // Wait for publisher to receive the initial name
    await expect(async () => {
      const headerText = await publisherPage.locator('h1').textContent()
      expect(headerText).toContain(initialName)
    }).toPass({ timeout: 10000 })

    // Now rename the doorbell
    const newName = 'Renamed Test Doorbell'
    const nameInput = subscriberPage.locator('[data-testid="doorbell-name"]')

    // Click to focus, clear existing text, type new name
    // pressSequentially properly triggers Svelte's input event handlers
    await nameInput.click()
    await nameInput.fill('')
    await nameInput.pressSequentially(newName, { delay: 10 })

    // Verify input value changed
    await expect(nameInput).toHaveValue(newName)

    // Wait for debounce (500ms) + P2P propagation
    await subscriberPage.waitForTimeout(1500)

    // Verify 1: Subscriber's history is updated in localStorage
    await expect(async () => {
      const subscriberHistoryData = await subscriberPage.evaluate((t) => {
        const data = localStorage.getItem('doorbell_subscriber_history')
        if (!data) return null
        const history = JSON.parse(data)
        return history.find((e: { token: string }) => e.token === t)
      }, token)
      expect(subscriberHistoryData?.name).toBe(newName)
    }).toPass({ timeout: 5000 })

    // Verify 2: Publisher's display is updated (header shows new name)
    await expect(async () => {
      const headerText = await publisherPage.locator('h1').textContent()
      expect(headerText).toContain(newName)
    }).toPass({ timeout: 15000 })

    // Verify 3: Publisher's history is updated in localStorage
    await expect(async () => {
      const publisherHistoryData = await publisherPage.evaluate((t) => {
        const data = localStorage.getItem('doorbell_publisher_history')
        if (!data) return null
        const history = JSON.parse(data)
        return history.find((e: { token: string }) => e.token === t)
      }, token)
      expect(publisherHistoryData?.name).toBe(newName)
    }).toPass({ timeout: 5000 })

    // Clean up
    await subscriberContext.close()
    await publisherContext.close()
  })
})
