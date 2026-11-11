/**
 * Pseudo-locale generator (change responsive-and-i18n-hardening): French text made about 40% longer, accented and
 * bracketed, to expose hard-coded strings and overflow. Placeholders such as `{n}` are left untouched.
 */
export const PSEUDO_LANG = 'pseudo'
export const PSEUDO_GROWTH = 1.4
const OPEN = '['
const CLOSE = ']'

const ACCENTS: Record<string, string> = {
  a: 'á', c: 'ç', e: 'é', i: 'í', n: 'ñ', o: 'ó', u: 'ú', y: 'ý',
  A: 'Á', C: 'Ç', E: 'É', I: 'Í', N: 'Ñ', O: 'Ó', U: 'Ú', Y: 'Ý',
}
const VOWEL = /[aeiouyáéíóúý]/i

/** True when the page asks for the pseudo-locale: `?lang=pseudo`. Never stored, never offered in a picker. */
export const wantsPseudo = (search: string): boolean => /(?:^|[?&])lang=pseudo(?:&|#|$)/.test(search)

export function pseudolocalize(text: string): string {
  // Odd indexes are `{placeholder}` kept as written; even indexes are text, one cell per character.
  const parts = text.split(/(\{\w+\})/).map((p, i) => (i % 2 === 1 ? p : [...p].map((c) => ACCENTS[c] ?? c)))
  let extra = Math.max(0, Math.round(text.length * PSEUDO_GROWTH) - OPEN.length - CLOSE.length - text.length)
  // Stretch vowels in turn so the longer text still wraps like a real sentence.
  const vowels = parts.flatMap((p, i) => (typeof p === 'string' ? [] : p.flatMap((c, j) => (VOWEL.test(c) ? [[i, j] as const] : []))))
  for (let k = 0; vowels.length > 0 && k < extra; k++) {
    const [i, j] = vowels[k % vowels.length]!
    const cells = parts[i] as string[]
    cells[j] = `${cells[j]!}${cells[j]![0]!}`
  }
  if (vowels.length > 0) extra = 0
  return `${OPEN}${parts.map((p) => (typeof p === 'string' ? p : p.join(''))).join('')}${'~'.repeat(extra)}${CLOSE}`
}
