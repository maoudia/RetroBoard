/** localStorage that never throws (private windows, blocked storage, quota). */
export const safeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch { return fallback }
  },
  set(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  },
}

export function randomId(bytes = 16): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
