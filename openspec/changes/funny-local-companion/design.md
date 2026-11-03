# Design

## Decisions
- Reuse the `local-ai-companion` model port; persona is a system prompt plus tone rules, kept in i18n so fr and en stay aligned.
- Board content is untrusted input and is not sent to the model by default; jokes are generic or based on phase names only.
- Respect reduced motion and the calm UI rules (no popups during writing).
