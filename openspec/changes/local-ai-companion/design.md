# Design

## Decisions

- `LlmPort { available(), complete(prompt, opts), stream(...) }` with adapters: `ChromePromptApi` (`LanguageModel`, desktop Chrome 148+ for web pages per Chrome docs), `OpenAiCompatibleLocal` (base URL default `http://localhost:11434/v1`, user configures CORS on their server), `WebLlm` (lazy-loaded, large download, explicit consent).
- CSP: `connect-src` gets `http://localhost:*` and `http://127.0.0.1:*` only when the participant enables a localhost provider (dynamic CSP per page is not possible for a static site; instead the CSP always allows these two origins and the adapter is the only caller). To be validated with the security review.
- Prompts are templates in `packages/application/ai/prompts`, tested with golden inputs; outputs parsed into structured suggestions.
- Facilitator bot is a pure policy over the agenda read model.

Security and privacy note: board content goes only to the provider the participant chose on their own machine.
