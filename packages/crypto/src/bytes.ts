/** Byte helpers shared by the primitives. Base64url without padding (RFC 4648 section 5). */

export type Bytes = Uint8Array<ArrayBuffer>

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export const utf8 = (text: string): Bytes => encoder.encode(text) as Bytes
export const fromUtf8 = (bytes: Uint8Array): string => decoder.decode(bytes)

export function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) { out.set(p, offset); offset += p.length }
  return out
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replaceAll('=', '')
}

/** Returns null on malformed input instead of throwing: links come from untrusted URLs. */
export function fromBase64Url(text: string): Bytes | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null
  // atob accepts input without its padding (forgiving-base64, WHATWG), so none is added back.
  return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
}

export const toHex = (bytes: Uint8Array): string => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')

export function fromHex(hex: string): Bytes {
  if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw new Error('invalid hex')
  return Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16))
}

/** Constant-time comparison for equal-length secrets. */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  return a.reduce((diff, x, i) => diff | (x ^ b[i]!), 0) === 0
}
