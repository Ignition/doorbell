import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { notificationStore } from '../../src/stores/notifications'
import { MAX_NOTIFICATIONS } from '../../src/lib/config'

describe('Notification Store', () => {
  beforeEach(() => {
    notificationStore.clear()
  })

  describe('addRing', () => {
    it('adds a notification with timestamp and generated id', () => {
      const timestamp = Date.now()
      const id = notificationStore.addRing(timestamp)

      const notifications = get(notificationStore)
      expect(notifications).toHaveLength(1)
      expect(notifications[0].id).toBe(id)
      expect(notifications[0].timestamp).toBe(timestamp)
    })

    it('prepends new notifications to the list', () => {
      const timestamp1 = 1000
      const timestamp2 = 2000

      notificationStore.addRing(timestamp1)
      notificationStore.addRing(timestamp2)

      const notifications = get(notificationStore)
      expect(notifications).toHaveLength(2)
      expect(notifications[0].timestamp).toBe(timestamp2)
      expect(notifications[1].timestamp).toBe(timestamp1)
    })

    it('limits notifications to MAX_NOTIFICATIONS', () => {
      for (let i = 0; i < MAX_NOTIFICATIONS + 5; i++) {
        notificationStore.addRing(i)
      }

      const notifications = get(notificationStore)
      expect(notifications).toHaveLength(MAX_NOTIFICATIONS)
    })

    it('keeps most recent notifications when at limit', () => {
      for (let i = 0; i < MAX_NOTIFICATIONS + 3; i++) {
        notificationStore.addRing(i)
      }

      const notifications = get(notificationStore)
      // Most recent should be MAX_NOTIFICATIONS + 2 (0-indexed from loop)
      expect(notifications[0].timestamp).toBe(MAX_NOTIFICATIONS + 2)
    })
  })

  describe('dismiss', () => {
    it('removes notification by id', () => {
      const id1 = notificationStore.addRing(1000)
      const id2 = notificationStore.addRing(2000)

      notificationStore.dismiss(id1)

      const notifications = get(notificationStore)
      expect(notifications).toHaveLength(1)
      expect(notifications[0].id).toBe(id2)
    })

    it('does nothing if id not found', () => {
      notificationStore.addRing(1000)
      notificationStore.dismiss('nonexistent-id')

      const notifications = get(notificationStore)
      expect(notifications).toHaveLength(1)
    })
  })

  describe('clear', () => {
    it('removes all notifications', () => {
      notificationStore.addRing(1000)
      notificationStore.addRing(2000)
      notificationStore.addRing(3000)

      notificationStore.clear()

      const notifications = get(notificationStore)
      expect(notifications).toHaveLength(0)
    })
  })
})
