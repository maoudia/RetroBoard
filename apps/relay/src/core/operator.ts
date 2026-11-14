/** The operator of a deployment, as the legal and privacy pages show it. */
export interface OperatorSettings {
  /** Who runs this instance. Unset: the hosted service text (Cloudflare) stays. */
  OPERATOR_NAME?: string
  /** Postal address of the operator, optional. */
  OPERATOR_ADDRESS?: string
  /** How to reach the operator (an e-mail address or a page), optional. */
  OPERATOR_CONTACT?: string
}

const MAX_FIELD = 300

const clean = (value: string | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_FIELD)

/** `/operator.json`: the configured operator, or `{}` for the hosted defaults. Public text, read by the legal pages. */
export function operatorResponse(settings: OperatorSettings, head: boolean): Response {
  const name = clean(settings.OPERATOR_NAME)
  const body = name ? { name, address: clean(settings.OPERATOR_ADDRESS), contact: clean(settings.OPERATOR_CONTACT) } : {}
  return new Response(head ? null : JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
