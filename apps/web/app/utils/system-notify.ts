/** System notifications through the Notification API only: no push service, no server. */
export const canNotify = (): boolean => typeof Notification !== 'undefined'

/** Asks the browser for permission; call it from the opt-in click only. */
export async function askNotifyPermission(): Promise<boolean> {
  if (!canNotify()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try { return (await Notification.requestPermission()) === 'granted' } catch { return false }
}

/** Shows a notification when permission was granted and the tab is in the background. */
export function systemNotify(title: string, body: string): boolean {
  if (!canNotify() || Notification.permission !== 'granted' || !document.hidden) return false
  try {
    const n = new Notification(title, { body, tag: 'retroboard-time', silent: true })
    n.onclick = () => { window.focus(); n.close() }
    return true
  } catch { return false }
}
