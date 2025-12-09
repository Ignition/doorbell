import { describe, it, expect } from 'vitest'
import {
  generateToken,
  isValidToken,
  deriveTopicId,
  extractTokenFromPath
} from '$lib/crypto/token'
import { buildRingerUrl } from '$lib/utils/url'

describe('Token Generation', () => {
  it('generates a 43-character base64url token', () => {
    const token = generateToken()
    expect(token).toHaveLength(43)
  })

  it('generates tokens with valid base64url characters', () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()))
    expect(tokens.size).toBe(100)
  })
})

describe('Token Validation', () => {
  it('validates correctly generated tokens', () => {
    const token = generateToken()
    expect(isValidToken(token)).toBe(true)
  })

  it('rejects empty strings', () => {
    expect(isValidToken('')).toBe(false)
  })

  it('rejects tokens with wrong length', () => {
    expect(isValidToken('abc123')).toBe(false)
    expect(isValidToken('a'.repeat(44))).toBe(false)
    expect(isValidToken('a'.repeat(42))).toBe(false)
  })

  it('rejects tokens with invalid characters', () => {
    const invalidToken = generateToken().replace(/[A-Za-z]/, '!')
    expect(isValidToken(invalidToken)).toBe(false)
  })
})

describe('Topic ID Derivation', () => {
  it('derives a topic ID with correct format', async () => {
    const token = generateToken()
    const topicId = await deriveTopicId(token)

    // 32 hex chars = 16 bytes = 128 bits of collision resistance
    expect(topicId).toMatch(/^doorbell-[a-f0-9]{32}$/)
  })

  it('derives consistent topic IDs for the same token', async () => {
    const token = generateToken()
    const topicId1 = await deriveTopicId(token)
    const topicId2 = await deriveTopicId(token)

    expect(topicId1).toBe(topicId2)
  })

  it('derives different topic IDs for different tokens', async () => {
    const token1 = generateToken()
    const token2 = generateToken()
    const topicId1 = await deriveTopicId(token1)
    const topicId2 = await deriveTopicId(token2)

    expect(topicId1).not.toBe(topicId2)
  })
})

describe('URL Building', () => {
  it('builds a valid ringer URL', () => {
    const token = generateToken()
    const url = buildRingerUrl(token)

    expect(url).toContain('#/ring/')
    expect(url).toContain(token)
  })
})

describe('Token Extraction from Path', () => {
  it('extracts token from valid path', () => {
    const token = generateToken()
    const path = `/ring/${token}`
    const extracted = extractTokenFromPath(path)

    expect(extracted).toBe(token)
  })

  it('returns null for invalid paths', () => {
    expect(extractTokenFromPath('/')).toBeNull()
    expect(extractTokenFromPath('/ring/')).toBeNull()
    expect(extractTokenFromPath('/ring/short')).toBeNull()
    expect(extractTokenFromPath('/other/path')).toBeNull()
  })
})
