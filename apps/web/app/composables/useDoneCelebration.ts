import { tokensFor } from '@retroboard/themes'
import { doneTransitions, celebrationAllowed } from '~/utils/done-celebration'
import { CELEBRATION_MS, STATIC_MS, createCelebrationQueue, playCelebration, playCombined, prefersReducedMotion } from '~/utils/fx'

type Job = { kind: 'one'; actionId: string; sourceId: string | null } | { kind: 'many'; n: number }

/**
 * Plays the theme's celebration on the idea (post-it or cluster) whose action just went to done, and on the same action in
 * the drawer (change done-celebration). Driven by the board snapshot, so every device that sees the change live plays it
 * and a device that joins late, replays or loads history does not. One at a time, three at most, the rest in one burst.
 * Called once, by the board page.
 */
export function useDoneCelebration() {
  const board = useBoardStore()
  const theme = useThemeStore()
  const settings = useSettingsStore()
  const ui = useUiStore()
  const announcer = useLiveAnnouncer()
  const { t } = useT()

  const look = () => {
    const tokens = tokensFor(theme.theme, theme.variant)
    return { colors: theme.theme.celebration.palette.map((k) => tokens[k]), label: t('celebration.stamp') }
  }
  const targets = (job: Extract<Job, { kind: 'one' }>): HTMLElement[] => {
    const escape = (id: string) => CSS.escape(id)
    const found = [
      job.sourceId ? document.querySelector<HTMLElement>(`[data-anchor="${escape(job.sourceId)}"]`) : null,
      document.querySelector<HTMLElement>(`[data-testid="action-${escape(job.actionId)}"]`),
    ]
    return found.filter((e): e is HTMLElement => !!e)
  }

  const queue = createCelebrationQueue<Job>({
    combine: (jobs) => ({ kind: 'many', n: jobs.length }),
    run(job, done) {
      const { colors, label } = look()
      if (job.kind === 'many') { playCombined(colors); setTimeout(done, CELEBRATION_MS); return }
      const hosts = targets(job)
      if (!hosts.length) return done()
      playCelebration(hosts, theme.theme.celebration.id, { colors, label })
      setTimeout(done, prefersReducedMotion() ? STATIC_MS : CELEBRATION_MS)
    },
  })

  onMounted(() => {
    const off = board.onSnapshot((prev, next) => {
      const moves = doneTransitions(prev, next)
      if (!moves.length || !celebrationAllowed(settings.s, ui.presenter, window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return
      announcer.collect({ kind: 'done' })
      for (const m of moves) queue.push({ kind: 'one', actionId: m.actionId, sourceId: m.sourceId })
    })
    onBeforeUnmount(off)
  })
}
