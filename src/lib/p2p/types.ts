export type ConnectionState =
  | 'initializing'
  | 'connecting'
  | 'connected'
  | 'error'

export type PeerKind = 'doorbell' | 'ringer'

export interface DoorbellMessage {
  type: 'ring'
  timestamp: number
  nonce: string
}

export interface DoorbellInfo {
  type: 'info'
  name: string
  clock: number  // Lamport clock for consistency
}

export interface PeerPresence {
  type: 'presence'
  kind: PeerKind
}
