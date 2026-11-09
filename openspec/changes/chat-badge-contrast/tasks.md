# Tasks

## 1. Readable unread badge

- [x] 1.1 `ChatPanel.vue` badge text uses `var(--accent-ink)`; `packages/themes/test/themes.test.ts` asserts `accentInk` on `danger` at 4.5:1 in every variant of every theme; verify `pnpm exec vitest run packages/themes`
