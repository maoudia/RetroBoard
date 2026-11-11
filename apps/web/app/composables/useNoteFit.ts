import type { Ref } from 'vue'

/**
 * Text fitting of a note (change postit-visual-system, task 1.2). The text keeps a readable size (base.css floors it at --fs-sm):
 * a note that does not fit its lines first steps down one size, and if it still does not fit it is clipped and offers "read more".
 * The size is written on the element as `data-fit` ("base" or "min"); the clipping itself is CSS (line clamp).
 *
 * A board holds many notes, so the measuring of every note is batched: one frame writes the sizes of all pending notes, then reads
 * their overflow together, so the browser lays the page out twice per frame whatever the number of notes.
 */
interface Job { el: HTMLElement; skip: () => boolean; set: (clipped: boolean) => void; width: number }

const jobs = new Map<Element, Job>()
const queue = new Set<Job>()
let frame = 0
let sizes: ResizeObserver | null = null

const overflows = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 1

function flush() {
  frame = 0
  const run = [...queue].filter((j) => j.el.isConnected && !j.skip())
  queue.clear()
  for (const j of run) j.el.dataset.fit = 'base'
  const tight = run.filter((j) => overflows(j.el))
  for (const j of tight) j.el.dataset.fit = 'min'
  const clipped = new Set(tight.filter((j) => overflows(j.el)))
  for (const j of run) j.set(clipped.has(j))
}

function schedule(job: Job) {
  queue.add(job)
  if (!frame) frame = requestAnimationFrame(flush)
}

/** One observer for every note: a note is measured again when its width changes (a column resized, a screen turned), not when its own height does. */
function watcher() {
  sizes ??= new ResizeObserver((entries) => {
    for (const e of entries) {
      const job = jobs.get(e.target)
      if (!job) continue
      const width = Math.round(e.contentRect.width)
      if (width === job.width) continue
      job.width = width
      schedule(job)
    }
  })
  return sizes
}

/**
 * `el` is the text element (it may come and go with the editor); `text` the note text. Returns whether the text is clipped and
 * whether the reader opened it ("read more").
 */
export function useNoteFit(el: Ref<HTMLElement | null>, text: () => string) {
  const clipped = ref(false)
  const open = ref(false)
  const job: Job = { el: null as unknown as HTMLElement, skip: () => open.value, set: (v) => { clipped.value = v }, width: -1 }
  const again = () => { if (job.el) schedule(job) }

  watch(el, (next, prev) => {
    if (prev) { watcher().unobserve(prev); jobs.delete(prev); queue.delete(job) }
    if (next) { job.el = next; job.width = -1; jobs.set(next, job); watcher().observe(next) }
  }, { flush: 'post', immediate: true })
  onMounted(() => { again(); void document.fonts?.ready.then(again) })
  onBeforeUnmount(() => { if (job.el) { watcher().unobserve(job.el); jobs.delete(job.el) } queue.delete(job) })

  // A new text closes "read more" (the measure then starts from the clipped view); a close measures again; zoom and density change the lines.
  watch(text, () => { open.value = false; again() }, { flush: 'post' })
  watch(open, (v) => { if (!v) again() }, { flush: 'post' })
  const layout = useLayoutStore()
  const settings = useSettingsStore()
  watch(() => [layout.zoom, layout.density ?? settings.s.density], again, { flush: 'post' })
  return { clipped, open }
}
