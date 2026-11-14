import { ref } from 'vue'
import { td } from '~/i18n'

/** The operator of a self-hosted instance, from `/operator.json` (OPERATOR_* settings of the relay). */
export interface Operator { name: string; address: string; contact: string }

/** Module level: the answer is read once per page load and shared by the legal pages. Null on the hosted service. */
const operator = ref<Operator | null>(null)
let requested = false

/** The paragraphs that name the host, with the variant for a configured operator (`<key>.op`). A contact is needed to replace `legal.4.p`. */
const VARIANTS: Record<string, { needsContact?: boolean }> = {
  'legal.2.p': {}, 'legal.4.p': { needsContact: true },
  'privacy.1.p': {}, 'privacy.2.p': {}, 'privacy.2.li.7': {}, 'privacy.5.p': {}, 'privacy.6.p': {},
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

async function load(): Promise<void> {
  if (requested) return
  requested = true
  try {
    const res = await fetch('/operator.json', { headers: { Accept: 'application/json' } })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return
    const body = (await res.json()) as Record<string, unknown>
    const name = text(body.name)
    if (name) operator.value = { name, address: text(body.address), contact: text(body.contact) }
  } catch {
    // Offline or a dev server without the relay: the hosted text stays.
  }
}

export function useOperator() {
  onMounted(load)
  /** The text of a legal paragraph: the hosted wording, or the operator variant once `/operator.json` names one. */
  function legalText(key: string): string {
    const op = operator.value
    const variant = VARIANTS[key]
    if (!op || !variant || (variant.needsContact && !op.contact)) return td(key)
    return td(`${key}.op`, {
      name: op.name,
      where: op.address ? `, ${op.address}` : '',
      contact: op.contact,
      operator: op.contact ? `${op.name} (${op.contact})` : op.name,
    })
  }
  return { operator, legalText }
}
