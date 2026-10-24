/**
 * Port for agents running in the user's browser (WebMCP today).
 * Tool definitions are plain data so they can be tested without a browser.
 */
export interface JsonSchema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
}

/** What a human sees before an agent changes the shared board. */
export interface Confirmation {
  title: string
  items: string[]
}

export type ToolOutput = { ok: true; data: unknown } | { ok: false; error: string }

export interface AgentTool<I = Record<string, unknown>> {
  name: string
  title: string
  description: string
  inputSchema: JsonSchema
  readOnly: boolean
  /** When set, the adapter asks the human before `run`. Returns null when nothing would change. */
  confirm?: (input: I) => Confirmation | null
  run: (input: I) => ToolOutput | Promise<ToolOutput>
}

export interface BrowserAgentPort {
  available(): boolean
  /** Registers tools; the returned function unregisters them. */
  register(tools: AgentTool[]): () => void
}
