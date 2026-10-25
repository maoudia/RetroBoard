import { ANNOUNCE_WINDOW_MS, type AnnounceItem, type AnnounceSay, summarizeAnnouncements } from '@retroboard/application'

/**
 * Status messages for screen readers (WCAG 4.1.3). Two shared live regions: polite for events
 * merged over a short window, assertive for the end of the time. Nothing here moves the focus.
 */
const politeText = ref('')
const assertiveText = ref('')
const pending: AnnounceItem[] = []
let timer: ReturnType<typeof setTimeout> | undefined

/** Clear then set on the next tick, so the same sentence is announced again. */
function speak(target: Ref<string>, text: string) {
  target.value = ''
  void nextTick(() => { target.value = text })
}

export function useLiveAnnouncer() {
  const { t } = useT()
  const say: AnnounceSay = (key, params) => t(key as never, params as never)

  function flush() {
    timer = undefined
    const messages = summarizeAnnouncements(pending.splice(0), say)
    if (messages.length) speak(politeText, messages.join('. '))
  }
  return {
    politeText, assertiveText,
    /** Queues an event; one merged message is spoken when the window closes. */
    collect(item: AnnounceItem) { pending.push(item); timer ??= setTimeout(flush, ANNOUNCE_WINDOW_MS) },
    /** Interrupting message: the end of a timer. */
    assertive(text: string) { speak(assertiveText, text) },
  }
}
