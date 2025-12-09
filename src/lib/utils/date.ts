/**
 * Date formatting utilities.
 */

/**
 * Format a timestamp for display in history lists.
 * Shows month, day, hour, and minute in locale-appropriate format.
 */
export function formatHistoryDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format a timestamp as time only.
 * Shows hour, minute, and second in locale-appropriate format.
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
