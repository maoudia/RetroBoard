import { type AgentTool, createBoardAgentTools, createSetupAgentTools } from '@retroboard/application'
import { THEMES } from '@retroboard/themes'
import { createWebMcpAdapter } from '~/adapters/webmcp'
import { currentLocale } from '~/i18n'
import { exportLabels, toMarkdown } from '~/utils/export'

/** Registers tools while `enabled` is true and unregisters them otherwise or on unmount. */
function useRegistration(enabled: Ref<boolean>, build: () => AgentTool[]) {
  const agent = useAgentStore()
  const port = createWebMcpAdapter(agent.ask)
  let dispose: (() => void) | null = null
  watch(() => enabled.value && port.available(), (on) => {
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
