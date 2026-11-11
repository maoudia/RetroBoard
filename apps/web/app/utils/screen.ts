import { type ScreenId, screenOf, screenTokens } from '@retroboard/themes'

/** Writes the screen class as `data-screen` and its tokens (breakpoints, type scale, fluid sizes) on the root; a resize inside one class writes nothing. Pure DOM, like applyTheme. */
export function applyScreen(width: number, root: HTMLElement = document.documentElement): ScreenId {
  const screen = screenOf(width)
  if (root.dataset.screen === screen) return screen
  for (const [k, v] of Object.entries(screenTokens(screen))) root.style.setProperty(k, v)
  root.dataset.screen = screen
  return screen
}
