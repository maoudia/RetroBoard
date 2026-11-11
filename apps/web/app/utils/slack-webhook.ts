/**
 * Optional Slack incoming webhook (change export-hub, task 3.1). The URL is a secret that lives in this
 * device's settings only: it is never part of a board event and never reaches the relay. The browser
 * posts straight to Slack; the Content-Security-Policy allows exactly this origin for that.
 */
export const SLACK_WEBHOOK_ORIGIN = 'https://hooks.slack.com'

/** `https://hooks.slack.com/services/T.../B.../token`, nothing else (no credentials, port, query or other host). */
export function isSlackWebhook(value: string): boolean {
  let url: URL
  try { url = new URL(value.trim()) } catch { return false }
  return url.origin === SLACK_WEBHOOK_ORIGIN && !url.username && !url.password && !url.search && !url.hash
    && /^\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/.test(url.pathname)
}

/** sent: Slack answered ok. rejected: Slack answered with an error (revoked or mistyped URL). unreachable: blocked or offline. */
export type SlackResult = 'sent' | 'rejected' | 'unreachable' | 'invalid'

/**
 * Posts the summary as `{ "text": ... }`. The body is JSON sent as text/plain: that is a "simple" request,
 * so the browser sends no CORS preflight (Slack does not answer one) and the answer stays readable.
 */
export async function postToSlack(webhook: string, text: string, send: typeof fetch = fetch): Promise<SlackResult> {
  if (!isSlackWebhook(webhook)) return 'invalid'
  try {
    const res = await send(webhook.trim(), {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ text }),
      credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
    })
    return res.ok ? 'sent' : 'rejected'
  } catch { return 'unreachable' }
}
