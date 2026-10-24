/** Reconnect delay: exponential up to 10 s, with jitter so a relay restart does not get a thundering herd. */
export function backoffDelay(attempt: number, random = Math.random): number {
  return Math.min(10_000, 500 * 2 ** attempt) + Math.floor(random() * 300)
}
