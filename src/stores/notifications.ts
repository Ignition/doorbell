import { writable } from 'svelte/store'
import { MAX_NOTIFICATIONS } from '$lib/config'
import { generateUUID } from '$lib/utils'

export interface RingNotification {
  id: string
  timestamp: number
}

function createNotificationStore() {
  const { subscribe, update } = writable<RingNotification[]>([])

  return {
    subscribe,

    addRing(timestamp: number) {
      const notification: RingNotification = {
        id: generateUUID(),
        timestamp
      }

      update(notifications => [notification, ...notifications].slice(0, MAX_NOTIFICATIONS))

      return notification.id
    },

    dismiss(id: string) {
      update(notifications => notifications.filter(n => n.id !== id))
    },

    clear() {
      update(() => [])
    }
  }
}

export const notificationStore = createNotificationStore()
