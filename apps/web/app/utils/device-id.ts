import { randomBytes, toBase32 } from '@retroboard/crypto'
import { safeStorage } from './storage'

const KEY = 'retroboard:device'

/**
 * This browser's id for last-write-wins stamps and, later, the names of its files in a vault: 64 random bits as 13 base32
 * characters. Not the participant id (`cid`, which other people see) and never synced: two devices must not share it.
 */
export function deviceId(): string {
  const saved = safeStorage.get<string>(KEY, '')
  if (/^[a-z2-7]{13}$/.test(saved)) return saved
  const id = toBase32(randomBytes(8))
  safeStorage.set(KEY, id)
  return id
}
