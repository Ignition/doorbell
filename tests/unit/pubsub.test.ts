import { describe, it, expect, vi } from 'vitest'
import type { DoorbellMessage } from '$lib/p2p/types'

describe('DoorbellMessage', () => {
  it('has correct structure', () => {
    const message: DoorbellMessage = {
      type: 'ring',
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    }

    expect(message.type).toBe('ring')
    expect(typeof message.timestamp).toBe('number')
    expect(typeof message.nonce).toBe('string')
  })

  it('serializes to JSON correctly', () => {
    const message: DoorbellMessage = {
      type: 'ring',
      timestamp: 1234567890,
      nonce: 'test-nonce'
    }

    const json = JSON.stringify(message)
    const parsed = JSON.parse(json)

    expect(parsed).toEqual(message)
  })

  it('can be encoded and decoded as Uint8Array', () => {
    const message: DoorbellMessage = {
      type: 'ring',
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    }

    const encoded = new TextEncoder().encode(JSON.stringify(message))
    const decoded: DoorbellMessage = JSON.parse(new TextDecoder().decode(encoded))

    expect(decoded).toEqual(message)
  })
})
