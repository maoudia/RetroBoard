/** The browser's (or the Worker's) WebCrypto, or a clear error where there is none (insecure context). */
export const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error('WebCrypto is not available (secure context required)')
  return s
}
