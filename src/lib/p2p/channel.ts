import { joinRoom as trysteroJoinRoom } from 'trystero/nostr'
import type { Room, ActionSender } from 'trystero'
import type { DoorbellMessage, DoorbellInfo, PeerKind } from './types'
import { P2P_APP_ID, logger } from '../config'
import { generateUUID } from '../utils'

// Trystero-compatible JSON type
type JsonValue = null | string | number | boolean | JsonValue[] | {[key: string]: JsonValue}
type RingPayload = {[key: string]: JsonValue}
type InfoPayload = {[key: string]: JsonValue}
type PresencePayload = {[key: string]: JsonValue}

// ICE server config - keep to 4 or fewer to avoid slowing discovery
// STUN servers are free and handle most NAT traversal cases
// TURN is only needed for very restrictive networks
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:freestun.net:3478' },
  {
    urls: 'turn:freestun.net:3478',
    username: 'free',
    credential: 'free'
  }
]

// Nostr relays for peer discovery
const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band'
]

const CONFIG = {
  appId: P2P_APP_ID,
  rtcConfig: {
    iceServers: ICE_SERVERS
  },
  relayUrls: NOSTR_RELAYS
}

// Maximum clock drift tolerance (5 minutes in either direction)
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000

// Trystero uses "Room" internally - we alias it as Channel for our API
export type Channel = Room

// Map of channel to its send functions
const channelSendFns = new WeakMap<Channel, ActionSender<RingPayload>>()
const channelInfoFns = new WeakMap<Channel, ActionSender<InfoPayload>>()
const channelPresenceFns = new WeakMap<Channel, ActionSender<PresencePayload>>()

// Track peer kinds per channel
const channelPeerKinds = new WeakMap<Channel, Map<string, PeerKind>>()

export interface ChannelCallbacks {
  onPeerJoin?: (peerId: string, kind?: PeerKind) => void
  onPeerLeave?: (peerId: string) => void
  onRing?: (message: DoorbellMessage, peerId: string) => void
  onInfo?: (info: DoorbellInfo, peerId: string) => void
}

export interface JoinOptions {
  kind: PeerKind
}

export function joinDoorbellChannel(channelId: string, callbacks: ChannelCallbacks, options: JoinOptions): Channel {
  logger.info('P2P', 'Joining channel:', channelId, 'as', options.kind)

  const channel = trysteroJoinRoom(CONFIG, channelId)

  // Initialize peer kinds tracking for this channel
  const peerKinds = new Map<string, PeerKind>()
  channelPeerKinds.set(channel, peerKinds)

  // Set up the ring action
  const [sendRing, onRing] = channel.makeAction<RingPayload>('ring')
  channelSendFns.set(channel, sendRing)

  // Set up the info action (for doorbell name)
  const [sendInfo, onInfoMsg] = channel.makeAction<InfoPayload>('info')
  channelInfoFns.set(channel, sendInfo)

  // Set up the presence action (for peer kind identification)
  const [sendPresence, onPresence] = channel.makeAction<PresencePayload>('presence')
  channelPresenceFns.set(channel, sendPresence)

  // Handle incoming presence announcements
  onPresence((data, peerId) => {
    if (
      typeof data !== 'object' ||
      data === null ||
      data.type !== 'presence' ||
      (data.kind !== 'doorbell' && data.kind !== 'ringer')
    ) {
      logger.warn('P2P', 'Invalid presence format from:', peerId, data)
      return
    }

    const kind = data.kind as PeerKind
    const isNew = !peerKinds.has(peerId)
    peerKinds.set(peerId, kind)

    logger.info('P2P', 'Presence received from:', peerId, 'kind:', kind)

    // If this is a new peer, respond with our presence (handshake)
    // This ensures both sides know about each other
    if (isNew) {
      sendPresence({ type: 'presence', kind: options.kind })
      callbacks.onPeerJoin?.(peerId, kind)
    }
  })

  // Set up peer tracking
  channel.onPeerJoin((peerId) => {
    logger.info('P2P', 'Peer joined (raw):', peerId)
    // Send our presence to the new peer immediately
    // They will respond with their presence when they receive ours
    sendPresence({ type: 'presence', kind: options.kind })
    // Don't call onPeerJoin callback yet - wait for their presence announcement
  })

  channel.onPeerLeave((peerId) => {
    logger.info('P2P', 'Peer left:', peerId)
    peerKinds.delete(peerId)
    callbacks.onPeerLeave?.(peerId)
  })

  onInfoMsg((data, peerId) => {
    // Validate incoming info structure
    if (
      typeof data !== 'object' ||
      data === null ||
      data.type !== 'info' ||
      typeof data.name !== 'string' ||
      typeof data.clock !== 'number'
    ) {
      logger.warn('P2P', 'Invalid info format from:', peerId, data)
      return
    }

    logger.info('P2P', 'Info received from:', peerId, 'name:', data.name)

    const info: DoorbellInfo = {
      type: 'info',
      name: data.name,
      clock: data.clock
    }
    callbacks.onInfo?.(info, peerId)
  })

  onRing((data, peerId) => {
    // Validate incoming message structure
    if (
      typeof data !== 'object' ||
      data === null ||
      data.type !== 'ring' ||
      typeof data.timestamp !== 'number' ||
      typeof data.nonce !== 'string'
    ) {
      logger.warn('P2P', 'Invalid ring format from:', peerId, data)
      return
    }

    // Validate timestamp is reasonable (within 5 minutes of current time)
    const now = Date.now()
    const drift = Math.abs(now - data.timestamp)
    if (drift > MAX_TIMESTAMP_DRIFT_MS) {
      logger.warn('P2P', 'Ring timestamp drift too high:', drift, 'ms from:', peerId)
      return
    }

    logger.info('P2P', 'Ring received from:', peerId)

    const message: DoorbellMessage = {
      type: 'ring',
      timestamp: data.timestamp,
      nonce: data.nonce
    }
    callbacks.onRing?.(message, peerId)
  })

  return channel
}

export function sendRing(channel: Channel): void {
  const message: RingPayload = {
    type: 'ring',
    timestamp: Date.now(),
    nonce: generateUUID()
  }

  logger.info('P2P', 'Sending ring')

  const sendFn = channelSendFns.get(channel)
  if (sendFn) {
    sendFn(message)
  }
}

export function sendInfo(channel: Channel, name: string, clock: number): void {
  const message: InfoPayload = {
    type: 'info',
    name,
    clock
  }

  logger.info('P2P', 'Sending info:', name)

  const sendFn = channelInfoFns.get(channel)
  if (sendFn) {
    sendFn(message)
  }
}

export function leaveChannel(channel: Channel | null): void {
  if (channel) {
    logger.info('P2P', 'Leaving channel')
    channel.leave()
    channelSendFns.delete(channel)
    channelInfoFns.delete(channel)
    channelPresenceFns.delete(channel)
    channelPeerKinds.delete(channel)
  }
}

export function getPeerCount(channel: Channel): number {
  const peers = channel.getPeers()
  return peers ? Object.keys(peers).length : 0
}

export function getDoorbellCount(channel: Channel): number {
  const peerKinds = channelPeerKinds.get(channel)
  if (!peerKinds) return 0
  let count = 0
  for (const kind of peerKinds.values()) {
    if (kind === 'doorbell') count++
  }
  return count
}
