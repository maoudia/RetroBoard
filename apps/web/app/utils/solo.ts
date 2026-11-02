import { safeStorage } from '~/utils/storage'

/**
 * Solo boards are ordinary encrypted boards whose relay lives in the tab (change solo-parity-and-dedup).
 * The rooms that are solo on this device are remembered here; nothing about them is sent anywhere.
 */
const KEY = 'retroboard:solo'
const read = (): string[] => safeStorage.get<string[]>(KEY, [])
export const isSolo = (roomId: string | null | undefined): boolean => !!roomId && read().includes(roomId)
export const markSolo = (roomId: string): void => { const l = read(); if (!l.includes(roomId)) safeStorage.set(KEY, [...l.slice(-49), roomId]) }
export const unmarkSolo = (roomId: string): void => safeStorage.set(KEY, read().filter((r) => r !== roomId))
