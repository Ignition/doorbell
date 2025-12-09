/**
 * Safe localStorage wrappers that handle errors gracefully.
 * localStorage can throw in restricted contexts (private browsing, sandboxed iframes).
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore errors
  }
}

/**
 * Get a boolean preference from localStorage.
 */
export function getBooleanPreference(key: string, defaultValue: boolean = false): boolean {
  const value = safeGetItem(key)
  if (value === null) return defaultValue
  return value === 'true'
}

/**
 * Set a boolean preference in localStorage.
 */
export function setBooleanPreference(key: string, value: boolean): boolean {
  return safeSetItem(key, String(value))
}
