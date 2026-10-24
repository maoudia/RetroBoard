import type { AgentTool, BrowserAgentPort, Confirmation } from '@retroboard/application'

/**
 * WebMCP adapter. The spec is a draft (W3C Web Machine Learning CG): the entry point moved
 * from navigator.modelContext to document.modelContext, and registration handles changed
 * between drafts. Everything that depends on the draft shape lives in this file.
 */
interface ModelContextClient { requestUserInteraction?: <T>(cb: () => Promise<T>) => Promise<T> }
interface WebMcpTool {
  name: string
  title: string
  description: string
  inputSchema: object
  annotations: { readOnlyHint: boolean }
  execute: (input: Record<string, unknown> | undefined, client?: ModelContextClient) => Promise<unknown>
}
interface ModelContext {
  registerTool(tool: WebMcpTool): unknown
  unregisterTool?(name: string): unknown
}

export function findModelContext(): ModelContext | null {
  const fromDocument = (document as unknown as { modelContext?: ModelContext }).modelContext
  const fromNavigator = (navigator as unknown as { modelContext?: ModelContext }).modelContext
  return fromDocument ?? fromNavigator ?? null
}

const asText = (value: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] })

export function createWebMcpAdapter(askHuman: (c: Confirmation) => Promise<boolean>): BrowserAgentPort {
  return {
    available: () => findModelContext() !== null,
    register(tools: AgentTool[]) {
      const mc = findModelContext()
      if (!mc) return () => {}
      const disposers: (() => void)[] = []
      for (const tool of tools) {
        const handle = mc.registerTool({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: { readOnlyHint: tool.readOnly },
          execute: async (input, client) => {
            const args = input ?? {}
            const confirmation = tool.confirm?.(args)
            if (confirmation) {
              const ask = () => askHuman(confirmation)
              const approved = client?.requestUserInteraction ? await client.requestUserInteraction(ask) : await ask()
              if (!approved) return asText({ ok: false, error: 'The participant declined.' })
            }
            return asText(await tool.run(args))
          },
        })
        disposers.push(() => {
          const h = handle as { unregister?: () => void; abort?: () => void } | (() => void) | undefined
          if (typeof h === 'function') h()
          else if (h && typeof h.unregister === 'function') h.unregister()
          else mc.unregisterTool?.(tool.name)
        })
      }
      return () => { for (const d of disposers.splice(0)) { try { d() } catch { /* already gone */ } } }
    },
  }
}
