import { describe, it, expect, beforeEach } from 'vitest'
import { LamportClock } from '$lib/utils/lamport'

describe('LamportClock', () => {
  let clock: LamportClock

  beforeEach(() => {
    clock = new LamportClock()
  })

  describe('tick', () => {
    it('starts at 0 and increments on tick', () => {
      expect(clock.value).toBe(0)
      expect(clock.tick()).toBe(1)
      expect(clock.tick()).toBe(2)
      expect(clock.tick()).toBe(3)
      expect(clock.value).toBe(3)
    })

    it('increments monotonically', () => {
      const values: number[] = []
      for (let i = 0; i < 100; i++) {
        values.push(clock.tick())
      }
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })
  })

  describe('receive', () => {
    it('accepts first message from a peer', () => {
      expect(clock.receive('peer1', 1)).toBe(true)
      expect(clock.getLastSeenClock('peer1')).toBe(1)
    })

    it('rejects stale messages (lower clock)', () => {
      clock.receive('peer1', 5)
      expect(clock.receive('peer1', 3)).toBe(false)
      expect(clock.receive('peer1', 4)).toBe(false)
      expect(clock.getLastSeenClock('peer1')).toBe(5)
    })

    it('rejects duplicate clock values', () => {
      clock.receive('peer1', 5)
      expect(clock.receive('peer1', 5)).toBe(false)
    })

    it('accepts higher clock values', () => {
      clock.receive('peer1', 5)
      expect(clock.receive('peer1', 6)).toBe(true)
      expect(clock.receive('peer1', 10)).toBe(true)
      expect(clock.getLastSeenClock('peer1')).toBe(10)
    })

    it('tracks peers independently', () => {
      clock.receive('peer1', 5)
      clock.receive('peer2', 3)

      // peer1 rejects lower
      expect(clock.receive('peer1', 4)).toBe(false)
      // peer2 accepts higher (relative to peer2's last)
      expect(clock.receive('peer2', 4)).toBe(true)

      expect(clock.getLastSeenClock('peer1')).toBe(5)
      expect(clock.getLastSeenClock('peer2')).toBe(4)
    })

    it('updates local clock to max(local, received) + 1', () => {
      // Local clock starts at 0
      clock.receive('peer1', 10)
      // Should be max(0, 10) + 1 = 11
      expect(clock.value).toBe(11)

      // Now tick locally
      expect(clock.tick()).toBe(12)

      // Receive lower value - still updates local
      clock.receive('peer2', 5)
      // Should be max(12, 5) + 1 = 13
      expect(clock.value).toBe(13)

      // Receive higher value
      clock.receive('peer3', 100)
      // Should be max(13, 100) + 1 = 101
      expect(clock.value).toBe(101)
    })
  })

  describe('clearPeers', () => {
    it('clears peer tracking but preserves local clock', () => {
      clock.tick()
      clock.tick()
      clock.receive('peer1', 10)

      clock.clearPeers()

      // Local clock preserved
      expect(clock.value).toBe(11) // Was max(2, 10) + 1 = 11
      // Peer tracking cleared
      expect(clock.getLastSeenClock('peer1')).toBe(0)
      // Can receive from peer1 again at any clock
      expect(clock.receive('peer1', 1)).toBe(true)
    })
  })

  describe('reset', () => {
    it('resets everything', () => {
      clock.tick()
      clock.tick()
      clock.receive('peer1', 10)

      clock.reset()

      expect(clock.value).toBe(0)
      expect(clock.getLastSeenClock('peer1')).toBe(0)
    })
  })

  describe('distributed scenario', () => {
    it('ensures consistent ordering across two peers', () => {
      const clockA = new LamportClock()
      const clockB = new LamportClock()

      // A sends to B
      const msgFromA1 = clockA.tick() // 1
      clockB.receive('A', msgFromA1) // B: max(0,1)+1 = 2

      // B sends to A
      const msgFromB1 = clockB.tick() // 3
      clockA.receive('B', msgFromB1) // A: max(1,3)+1 = 4

      // A sends again
      const msgFromA2 = clockA.tick() // 5

      // Messages from A to B are properly ordered
      expect(msgFromA2).toBeGreaterThan(msgFromA1)

      // B accepts the second message
      expect(clockB.receive('A', msgFromA2)).toBe(true)
    })

    it('rejects out-of-order messages', () => {
      const clockA = new LamportClock()
      const clockB = new LamportClock()

      // A sends three messages
      const msg1 = clockA.tick() // 1
      const msg2 = clockA.tick() // 2
      const msg3 = clockA.tick() // 3

      // B receives them out of order: 3, 1, 2
      expect(clockB.receive('A', msg3)).toBe(true)  // accepts 3
      expect(clockB.receive('A', msg1)).toBe(false) // rejects 1 (stale)
      expect(clockB.receive('A', msg2)).toBe(false) // rejects 2 (stale)

      // Only message 3's value is tracked
      expect(clockB.getLastSeenClock('A')).toBe(3)
    })
  })
})
