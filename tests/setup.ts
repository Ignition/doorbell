import { vi } from 'vitest'

// Mock crypto.subtle for Node.js environment
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = await import('crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto
  })
}

// Mock window.location for tests
Object.defineProperty(globalThis, 'location', {
  value: {
    origin: 'http://localhost:5173',
    pathname: '/',
    hash: ''
  },
  writable: true
})
