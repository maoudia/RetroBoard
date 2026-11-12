/**
 * Structured logs for Workers Observability.
 * Contract: never log note text, names, client ids or the raw room id.
 * Only event names, command types, error codes and a short room hash.
 */
export interface Logger {
  info(event: string, fields?: Record<string, string | number | boolean>): void
  warn(event: string, fields?: Record<string, string | number | boolean>): void
}

export const consoleLogger: Logger = {
  info: (event, fields) => console.log(JSON.stringify({ level: 'info', event, ...fields })),
  warn: (event, fields) => console.warn(JSON.stringify({ level: 'warn', event, ...fields })),
}


/** Short, non-reversible tag to correlate logs of one board without exposing its id. */
export async function roomHash(room: string): Promise<string> {
  const data = new TextEncoder().encode(`retroboard:${room}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
  return Array.from(digest.slice(0, 4), (b) => b.toString(16).padStart(2, '0')).join('')
}
