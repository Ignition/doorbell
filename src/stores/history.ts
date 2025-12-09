import { writable } from 'svelte/store'
import type { DoorbellHistoryEntry, RingerHistoryEntry } from '$lib/storage'
import {
  getDoorbellHistory,
  addDoorbellEntry,
  updateDoorbellEntry,
  deleteDoorbellEntry,
  clearDoorbellHistory,
  getRingerHistory,
  addRingerEntry,
  deleteRingerEntry,
  clearRingerHistory
} from '$lib/storage'
import { generateUUID } from '$lib/utils'

function createHistoryStore() {
  const doorbellHistory = writable<DoorbellHistoryEntry[]>([])
  const ringerHistory = writable<RingerHistoryEntry[]>([])

  return {
    // Doorbell owner's history (their created doorbells)
    doorbellHistory: { subscribe: doorbellHistory.subscribe },
    // Ringer's history (doorbells they've rung)
    ringerHistory: { subscribe: ringerHistory.subscribe },

    // Backwards compatibility aliases
    get subscriberHistory() { return this.doorbellHistory },
    get publisherHistory() { return this.ringerHistory },

    loadFromStorage() {
      doorbellHistory.set(getDoorbellHistory())
      ringerHistory.set(getRingerHistory())
    },

    // Doorbell owner operations
    addDoorbell(token: string, name: string): DoorbellHistoryEntry {
      const entry: DoorbellHistoryEntry = {
        id: generateUUID(),
        token,
        name,
        createdAt: Date.now(),
        lastUsedAt: Date.now()
      }
      const updated = addDoorbellEntry(entry)
      doorbellHistory.set(updated)
      return entry
    },

    updateDoorbell(id: string, updates: Partial<DoorbellHistoryEntry>) {
      const updated = updateDoorbellEntry(id, updates)
      doorbellHistory.set(updated)
    },

    deleteDoorbell(id: string) {
      const updated = deleteDoorbellEntry(id)
      doorbellHistory.set(updated)
    },

    clearDoorbellHistory() {
      clearDoorbellHistory()
      doorbellHistory.set([])
    },

    // Ringer operations (doorbells they've visited)
    addRingerDoorbell(token: string, name: string): RingerHistoryEntry {
      const existing = getRingerHistory().find(e => e.token === token)
      const entry: RingerHistoryEntry = {
        id: existing?.id || generateUUID(),
        token,
        name,
        lastRungAt: Date.now()
      }
      const updated = addRingerEntry(entry)
      ringerHistory.set(updated)
      return entry
    },

    deleteRingerDoorbell(id: string) {
      const updated = deleteRingerEntry(id)
      ringerHistory.set(updated)
    },

    clearRingerHistory() {
      clearRingerHistory()
      ringerHistory.set([])
    },

    // Backwards compatibility methods
    addSubscriberDoorbell(token: string, name: string) { return this.addDoorbell(token, name) },
    updateSubscriberDoorbell(id: string, updates: Partial<DoorbellHistoryEntry>) { this.updateDoorbell(id, updates) },
    deleteSubscriberDoorbell(id: string) { this.deleteDoorbell(id) },
    clearSubscriberHistory() { this.clearDoorbellHistory() },
    addPublisherDoorbell(token: string, name: string) { return this.addRingerDoorbell(token, name) },
    deletePublisherDoorbell(id: string) { this.deleteRingerDoorbell(id) },
    clearPublisherHistory() { this.clearRingerHistory() }
  }
}

export const historyStore = createHistoryStore()
