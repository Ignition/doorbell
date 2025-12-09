import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getNotificationPermission,
  type NotificationPermission
} from '$lib/notifications/browser'

describe('Browser Notifications', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getNotificationPermission', () => {
    it('returns denied when Notification is not supported', () => {
      const originalNotification = globalThis.Notification
      // @ts-expect-error - intentionally removing Notification
      delete globalThis.Notification

      expect(getNotificationPermission()).toBe('denied')

      globalThis.Notification = originalNotification
    })

    it('returns the current permission state', () => {
      const mockNotification = {
        permission: 'granted' as NotificationPermission
      }
      Object.defineProperty(globalThis, 'Notification', {
        value: mockNotification,
        configurable: true
      })

      expect(getNotificationPermission()).toBe('granted')
    })
  })
})
