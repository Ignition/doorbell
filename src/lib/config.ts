// Token configuration
export const TOKEN_BYTES = 32
export const TOKEN_LENGTH = 43 // Base64url encoded length of TOKEN_BYTES

// Topic ID configuration
export const TOPIC_ID_BYTES = 16 // 128 bits for collision resistance
export const TOPIC_ID_PREFIX = 'doorbell'

// P2P configuration
export const P2P_APP_ID = import.meta.env.VITE_P2P_APP_ID || 'doorbell-p2p-app'
export const P2P_CONNECTION_TIMEOUT_MS = 2000

// Notification configuration
export const MAX_NOTIFICATIONS = 3

// Ringer configuration
export const RING_COOLDOWN_MS = 5000

// Retry configuration
export const RETRY_COOLDOWN_MS = 3000

// Crypto configuration
export const CRYPTO_TIMEOUT_MS = 5000

// History configuration
export const MAX_DOORBELL_HISTORY = 20
export const MAX_RINGER_HISTORY = 50
export const MAX_DOORBELL_NAME_LENGTH = 50

// Backwards compatibility
export const MAX_SUBSCRIBER_HISTORY = MAX_DOORBELL_HISTORY
export const MAX_PUBLISHER_HISTORY = MAX_RINGER_HISTORY

// Storage keys (kept stable for backwards compatibility with existing localStorage)
export const STORAGE_KEYS = {
  doorbellHistory: 'doorbell_subscriber_history',
  ringerHistory: 'doorbell_publisher_history',
  dramaticMode: 'doorbell_dramatic_mode',
  shareBoxCollapsed: 'doorbell_share_collapsed',
  notificationsEnabled: 'doorbell_notifications_enabled',
  debugMode: 'doorbell_debug',
  // Backwards compatibility aliases
  subscriberHistory: 'doorbell_subscriber_history',
  publisherHistory: 'doorbell_publisher_history'
} as const

// Debug mode: enabled via ?debug URL param or localStorage
function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('debug')) {
    localStorage.setItem(STORAGE_KEYS.debugMode, 'true')
    return true
  }
  return localStorage.getItem(STORAGE_KEYS.debugMode) === 'true'
}

export const DEBUG_MODE = import.meta.env.DEV || isDebugEnabled()

// Production-safe logger - only logs when debug mode is enabled
export const logger = {
  info: (tag: string, ...args: unknown[]) => {
    if (DEBUG_MODE) console.log(`[${tag}]`, ...args)
  },
  warn: (tag: string, ...args: unknown[]) => {
    if (DEBUG_MODE) console.warn(`[${tag}]`, ...args)
  },
  error: (tag: string, ...args: unknown[]) => {
    // Errors always log
    console.error(`[${tag}]`, ...args)
  }
}
