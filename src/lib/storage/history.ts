import type { DoorbellHistoryEntry, RingerHistoryEntry } from './types'
import { safeGetItem, safeSetItem, safeRemoveItem } from './localStorage'
import {
  STORAGE_KEYS,
  MAX_DOORBELL_HISTORY,
  MAX_RINGER_HISTORY
} from '../config'

// Doorbell History Operations (doorbell owner's saved doorbells)

export function getDoorbellHistory(): DoorbellHistoryEntry[] {
  const data = safeGetItem(STORAGE_KEYS.doorbellHistory)
  if (!data) return []

  try {
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveDoorbellHistory(history: DoorbellHistoryEntry[]): void {
  const limited = history.slice(0, MAX_DOORBELL_HISTORY)
  safeSetItem(STORAGE_KEYS.doorbellHistory, JSON.stringify(limited))
}

export function addDoorbellEntry(entry: DoorbellHistoryEntry): DoorbellHistoryEntry[] {
  const history = getDoorbellHistory()
  // Remove any existing entry with same token
  const filtered = history.filter(e => e.token !== entry.token)
  const updated = [entry, ...filtered].slice(0, MAX_DOORBELL_HISTORY)
  saveDoorbellHistory(updated)
  return updated
}

export function updateDoorbellEntry(
  id: string,
  updates: Partial<DoorbellHistoryEntry>
): DoorbellHistoryEntry[] {
  const history = getDoorbellHistory()
  const updated = history.map(entry =>
    entry.id === id ? { ...entry, ...updates } : entry
  )
  saveDoorbellHistory(updated)
  return updated
}

export function deleteDoorbellEntry(id: string): DoorbellHistoryEntry[] {
  const history = getDoorbellHistory()
  const updated = history.filter(entry => entry.id !== id)
  saveDoorbellHistory(updated)
  return updated
}

export function clearDoorbellHistory(): void {
  safeRemoveItem(STORAGE_KEYS.doorbellHistory)
}

// Ringer History Operations (ringer's saved doorbells they've rung)

export function getRingerHistory(): RingerHistoryEntry[] {
  const data = safeGetItem(STORAGE_KEYS.ringerHistory)
  if (!data) return []

  try {
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveRingerHistory(history: RingerHistoryEntry[]): void {
  const limited = history.slice(0, MAX_RINGER_HISTORY)
  safeSetItem(STORAGE_KEYS.ringerHistory, JSON.stringify(limited))
}

export function addRingerEntry(entry: RingerHistoryEntry): RingerHistoryEntry[] {
  const history = getRingerHistory()
  // Update existing entry with same token or add new
  const existingIndex = history.findIndex(e => e.token === entry.token)
  let updated: RingerHistoryEntry[]

  if (existingIndex >= 0) {
    // Update existing and move to front
    updated = [
      { ...history[existingIndex], ...entry },
      ...history.filter((_, i) => i !== existingIndex)
    ]
  } else {
    updated = [entry, ...history]
  }

  updated = updated.slice(0, MAX_RINGER_HISTORY)
  saveRingerHistory(updated)
  return updated
}

export function deleteRingerEntry(id: string): RingerHistoryEntry[] {
  const history = getRingerHistory()
  const updated = history.filter(entry => entry.id !== id)
  saveRingerHistory(updated)
  return updated
}

export function clearRingerHistory(): void {
  safeRemoveItem(STORAGE_KEYS.ringerHistory)
}

// Backwards compatibility aliases
export const getSubscriberHistory = getDoorbellHistory
export const saveSubscriberHistory = saveDoorbellHistory
export const addSubscriberEntry = addDoorbellEntry
export const updateSubscriberEntry = updateDoorbellEntry
export const deleteSubscriberEntry = deleteDoorbellEntry
export { clearDoorbellHistory as clearSubscriberHistory }

export const getPublisherHistory = getRingerHistory
export const savePublisherHistory = saveRingerHistory
export const addPublisherEntry = addRingerEntry
export const deletePublisherEntry = deleteRingerEntry
export { clearRingerHistory as clearPublisherHistory }
