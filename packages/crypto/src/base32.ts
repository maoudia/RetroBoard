/** RFC 4648 base32 without padding, lowercase: ASCII with no case collision on case-insensitive file stores. */
import type { Bytes } from './bytes'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'
const INDEX = new Map([...ALPHABET].map((c, i) => [c, i]))

export function toBase32(bytes: Uint8Array): string {
  let out = ''
  let bits = 0
  let acc = 0
  for (const b of bytes) {
    acc = (acc << 8) | b
    bits += 8
    for (; bits >= 5; bits -= 5) out += ALPHABET[(acc >> (bits - 5)) & 31]
    acc &= (1 << bits) - 1
  }
  return bits > 0 ? out + ALPHABET[(acc << (5 - bits)) & 31] : out
}

/** Returns null for a character outside the alphabet or leftover bits that are not zero. Case-insensitive. */
export function fromBase32(text: string): Bytes | null {
  const out: number[] = []
  let bits = 0
  let acc = 0
  for (const ch of text.toLowerCase()) {
    const v = INDEX.get(ch)
    if (v === undefined) return null
    acc = (acc << 5) | v
    bits += 5
    if (bits >= 8) { out.push((acc >> (bits - 8)) & 255); bits -= 8; acc &= (1 << bits) - 1 }
  }
  return acc === 0 ? new Uint8Array(out) : null
}

export const BASE32_ALPHABET = ALPHABET
