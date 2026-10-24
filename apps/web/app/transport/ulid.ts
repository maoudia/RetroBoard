// ULID (https://github.com/ulid/spec): 48-bit time + 80 random bits, Crockford base32, sortable.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function ulid(now = Date.now(), random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  let time = ''
  let t = now
  for (let i = 0; i < 10; i++) { time = ALPHABET[t % 32]! + time; t = Math.floor(t / 32) }
  const bytes = random(16)
  let rand = ''
  for (let i = 0; i < 16; i++) rand += ALPHABET[bytes[i]! % 32]
  return time + rand
}
