export interface DoorbellHistoryEntry {
  id: string
  token: string
  name: string
  createdAt: number
  lastUsedAt: number
}

export interface RingerHistoryEntry {
  id: string
  token: string
  name: string
  lastRungAt: number
}

// Backwards compatibility aliases
export type SubscriberHistoryEntry = DoorbellHistoryEntry
export type PublisherHistoryEntry = RingerHistoryEntry
