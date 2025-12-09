/**
 * URL building utilities for shareable doorbell links.
 */

/**
 * Get the base URL for the application, handling subdirectory deployments.
 */
function getBaseUrl(): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  return window.location.origin + baseUrl.replace(/\/$/, '')
}

/**
 * Build a shareable URL for a ringer to ring this doorbell.
 */
export function buildRingerUrl(token: string): string {
  return `${getBaseUrl()}/#/ring/${token}`
}

/**
 * Build a shareable URL for another device to receive doorbell rings.
 */
export function buildDoorbellUrl(token: string): string {
  return `${getBaseUrl()}/#/doorbell/${token}`
}

// Backwards compatibility alias
export const buildPublishUrl = buildRingerUrl
