import { applyScreen } from '~/utils/screen'

/** Keeps `data-screen` and the fluid type scale in step with the window width (phone, tablet, laptop, wide, tv). */
export default defineNuxtPlugin(() => {
  applyScreen(window.innerWidth)
  window.addEventListener('resize', () => applyScreen(window.innerWidth))
})
