import { writable, derived } from 'svelte/store'
import {
  joinDoorbellChannel,
  sendRing as sendRingAction,
  sendInfo as sendInfoAction,
  leaveChannel,
  getPeerCount,
  getDoorbellCount,
  type Channel,
  type ConnectionState,
  type DoorbellMessage,
  type DoorbellInfo,
  type PeerKind
} from '$lib/p2p'
import { P2P_CONNECTION_TIMEOUT_MS, logger } from '$lib/config'
import { LamportClock } from '$lib/utils'

interface P2PState {
  channel: Channel | null
  connectionState: ConnectionState
  peerCount: number
  doorbellCount: number
  error: string | null
  doorbellName: string | null
}

const initialState: P2PState = {
  channel: null,
  connectionState: 'initializing',
  peerCount: 0,
  doorbellCount: 0,
  error: null,
  doorbellName: null
}

function createP2PStore() {
  const { subscribe, set, update } = writable<P2PState>(initialState)

  let currentChannel: Channel | null = null
  const timers = new Set<ReturnType<typeof setTimeout>>()

  // Lamport clock for info message consistency
  const clock = new LamportClock()

  function scheduleTimeout(callback: () => void, ms: number) {
    const id = setTimeout(() => {
      timers.delete(id)
      callback()
    }, ms)
    timers.add(id)
  }

  function clearTimers() {
    timers.forEach(id => clearTimeout(id))
    timers.clear()
  }

  return {
    subscribe,

    joinChannel(
      channelId: string,
      onRing: (msg: DoorbellMessage) => void,
      options?: {
        onInfo?: (info: DoorbellInfo) => void
        getDoorbellName?: () => string
        kind?: PeerKind
      }
    ) {
      const peerKind = options?.kind ?? 'ringer'

      try {
        // Clear any existing timers, peer clocks, and leave old channel
        clearTimers()
        clock.clearPeers()
        const wasConnected = currentChannel !== null
        if (currentChannel) {
          leaveChannel(currentChannel)
          currentChannel = null
        }

        // Preserve 'connected' state when switching channels (P2P network stays up)
        update(s => ({
          ...s,
          connectionState: wasConnected ? 'connected' : 'connecting',
          peerCount: 0,
          doorbellCount: 0,
          error: null
        }))

        const channel = joinDoorbellChannel(channelId, {
          onPeerJoin: (peerId, kind) => {
            logger.info('Store', 'Peer joined:', peerId, 'kind:', kind)
            // If we're a doorbell, send our name to the new peer
            // No delay needed - presence handshake confirms connection is ready
            if (options?.getDoorbellName && currentChannel) {
              const name = options.getDoorbellName()
              if (name) {
                sendInfoAction(currentChannel, name, clock.tick())
              }
            }
            // Defer to next tick to ensure peer list is updated
            queueMicrotask(() => {
              const count = currentChannel ? getPeerCount(currentChannel) : 0
              const doorbells = currentChannel ? getDoorbellCount(currentChannel) : 0
              logger.info('Store', 'Peer count:', count, 'Doorbell count:', doorbells)
              update(s => ({
                ...s,
                connectionState: 'connected',
                peerCount: count,
                doorbellCount: doorbells
              }))
            })
          },
          onPeerLeave: (peerId) => {
            logger.info('Store', 'Peer left:', peerId)
            // Defer to next tick to ensure peer list is updated
            queueMicrotask(() => {
              const count = currentChannel ? getPeerCount(currentChannel) : 0
              const doorbells = currentChannel ? getDoorbellCount(currentChannel) : 0
              logger.info('Store', 'Peer count:', count, 'Doorbell count:', doorbells)
              update(s => ({
                ...s,
                peerCount: count,
                doorbellCount: doorbells,
                connectionState: count > 0 ? 'connected' : 'connecting'
              }))
            })
          },
          onRing: (message) => {
            logger.info('Store', 'Ring received!')
            onRing(message)
          },
          onInfo: (info, peerId) => {
            // Lamport clock check: only accept if clock is higher
            if (!clock.receive(peerId, info.clock)) {
              logger.info('Store', 'Ignoring stale info from:', peerId)
              return
            }

            logger.info('Store', 'Info received:', info.name, 'from:', peerId)
            update(s => ({ ...s, doorbellName: info.name }))
            options?.onInfo?.(info)
          }
        }, { kind: peerKind })

        currentChannel = channel

        update(s => ({
          ...s,
          channel,
          connectionState: 'connecting' // Will change to 'connected' when peer joins
        }))

        // Mark as connected after a short delay even without peers
        // (the doorbell is "ready" to receive)
        scheduleTimeout(() => {
          update(s => {
            if (s.connectionState === 'connecting') {
              return { ...s, connectionState: 'connected' }
            }
            return s
          })
        }, P2P_CONNECTION_TIMEOUT_MS)

      } catch (e) {
        logger.error('Store', 'Join error:', e)
        const message = e instanceof Error ? e.message : 'Unknown error'
        update(s => ({
          ...s,
          connectionState: 'error',
          error: message
        }))
      }
    },

    sendRing(): boolean {
      if (!currentChannel) {
        logger.warn('Store', 'Cannot send ring - no channel')
        return false
      }

      try {
        sendRingAction(currentChannel)
        return true
      } catch (e) {
        logger.error('Store', 'Send ring error:', e)
        return false
      }
    },

    sendInfo(name: string): boolean {
      if (!currentChannel) {
        logger.warn('Store', 'Cannot send info - no channel')
        return false
      }

      try {
        sendInfoAction(currentChannel, name, clock.tick())
        return true
      } catch (e) {
        logger.error('Store', 'Send info error:', e)
        return false
      }
    },

    leave() {
      clearTimers()
      clock.clearPeers()
      leaveChannel(currentChannel)
      currentChannel = null
      set(initialState)
    }
  }
}

export const p2pStore = createP2PStore()

export const connectionState = derived(
  p2pStore,
  $store => $store.connectionState
)

export const peerCount = derived(p2pStore, $store => $store.peerCount)

export const doorbellCount = derived(p2pStore, $store => $store.doorbellCount)

export const isConnected = derived(
  p2pStore,
  $store => $store.connectionState === 'connected'
)

export const doorbellName = derived(p2pStore, $store => $store.doorbellName)
