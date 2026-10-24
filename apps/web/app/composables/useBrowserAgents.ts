import { type AgentTool, createBoardAgentTools, createSetupAgentTools } from '@retroboard/application'
import { THEMES } from '@retroboard/themes'
import { createWebMcpAdapter, findModelContext } from '~/adapters/webmcp'
import { currentLocale } from '~/i18n'
import { exportLabels, toMarkdown } from '~/utils/export'

/**
 * Loads the MCP-B WebMCP polyfill (MIT, about 75 kB gzip, no network access) only when the
 * participant opted in and the browser has no native model context.
 */
let polyfill: Promise<void> | null = null
function loadPolyfill(): Promise<void> {
  // Zod (inside the polyfill) probes `new Function` unless jitless; strict CSPs report that probe as a violation.
  const g = globalThis as { __zod_globalConfig?: { jitless?: boolean } }
  g.__zod_globalConfig = { ...g.__zod_globalConfig, jitless: true }
  polyfill ??= import('@mcp-b/global')
    .then((m) => { if (!findModelContext()) m.initializeWebModelContext() })
    .catch(() => { polyfill = null })
  return polyfill
}

/** Registers tools while `enabled` is true and unregisters them otherwise or on unmount. */
function useRegistration(enabled: Ref<boolean>, build: () => AgentTool[]) {
  const agent = useAgentStore()
  const port = createWebMcpAdapter(agent.ask)
  const ready = ref(port.available())
  let dispose: (() => void) | null = null
  watch(enabled, async (on) => {
    if (on && !ready.value) {
      await loadPolyfill()
      ready.value = port.available()
    }
  }, { immediate: true })
  watch(() => enabled.value && ready.value, (on) => {
    dispose?.()
    dispose = on ? port.register(build()) : null
  }, { immediate: true })
  onBeforeUnmount(() => { dispose?.(); dispose = null; agent.answer(false) })
}

/** WebMCP tools of the board page. Requires the participant setting and the board policy. */
export function useBoardAgentTools() {
  const settings = useSettingsStore()
  const board = useBoardStore()
  const drafts = useDraftsStore()
  const { publish } = usePublish()
  const enabled = computed(() => settings.s.browserAgents && board.ready && board.settings?.browserAgentsAllowed !== false)
  useRegistration(enabled, () => createBoardAgentTools({
    view: () => board.snapshot,
    commands: board.commands,
    now: () => Date.now() + board.skew,
    exportMarkdown: () => (board.snapshot ? toMarkdown(board.snapshot, { date: new Date(), labels: exportLabels }) : ''),
    drafts: {
      list: () => drafts.drafts.map(({ id, columnId, text }) => ({ id, columnId, text })),
      add: (columnId, text) => drafts.add(columnId, text)?.id ?? null,
      publish: (ids) => publish(ids),
    },
  }))
}

/** WebMCP tools of the landing and creation pages. Nothing is created without a human click. */
export function useSetupAgentTools() {
  const settings = useSettingsStore()
  const agent = useAgentStore()
  const router = useRouter()
  const route = useRoute()
  const enabled = computed(() => settings.s.browserAgents)
  useRegistration(enabled, () => createSetupAgentTools({
    locale: () => currentLocale.value,
    themeIds: () => THEMES.map((t) => t.id),
    prepare: (config) => {
      agent.setupDraft = config
      if (!route.path.startsWith('/new')) void router.push('/new')
    },
  }))
}
