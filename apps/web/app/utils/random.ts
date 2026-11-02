import type { RandomInt } from '@retroboard/application'

/** Uniform integer in [0, max) from the browser CSPRNG, with rejection sampling (no modulo bias). */
export const secureRandomInt: RandomInt = (max) => {
  if (max <= 1) return 0
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  do { crypto.getRandomValues(buf) } while (buf[0]! >= limit)
  return buf[0]! % max
}
