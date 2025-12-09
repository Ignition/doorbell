/**
 * Browser notification module - handles system notification permissions and display.
 *
 * Coverage note: requestNotificationPermission() and showBrowserNotification() require
 * OS-level permission dialogs that cannot be automated in E2E tests. These functions
 * are simple wrappers around the Notification API with low risk.
 */

export type NotificationPermission = 'granted' | 'denied' | 'default'

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission as NotificationPermission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  const result = await Notification.requestPermission()
  return result as NotificationPermission
}

export function showBrowserNotification(title: string, body: string): void {
  if (getNotificationPermission() !== 'granted') {
    return
  }

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'doorbell-ring'
    })
  } catch (e) {
    // Notification constructor can throw in restricted contexts (e.g., sandboxed iframes)
    if (import.meta.env.DEV) {
      console.warn('Failed to create notification:', e)
    }
  }
}
