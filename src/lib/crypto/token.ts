import {
  TOKEN_BYTES,
  TOKEN_LENGTH,
  TOPIC_ID_BYTES,
  TOPIC_ID_PREFIX,
  CRYPTO_TIMEOUT_MS
} from '../config'

function base64urlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))
  return base64urlEncode(bytes)
}

export function isValidToken(token: string): boolean {
  if (!token || token.length !== TOKEN_LENGTH) return false
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return false

  try {
    const decoded = base64urlDecode(token)
    return decoded.length === TOKEN_BYTES
  } catch {
    return false
  }
}

export async function deriveTopicId(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)

  // Add timeout to prevent indefinite hang if crypto API fails
  const hashPromise = crypto.subtle.digest('SHA-256', data)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Crypto operation timeout')), CRYPTO_TIMEOUT_MS)
  )

  const hashBuffer = await Promise.race([hashPromise, timeoutPromise])
  const hashArray = new Uint8Array(hashBuffer)

  const hex = Array.from(hashArray.slice(0, TOPIC_ID_BYTES))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `${TOPIC_ID_PREFIX}-${hex}`
}

// Cached regex for token extraction
const tokenPathRegex = new RegExp(`^/ring/([A-Za-z0-9_-]{${TOKEN_LENGTH}})$`)

export function extractTokenFromPath(path: string): string | null {
  const match = path.match(tokenPathRegex)
  return match ? match[1] : null
}
