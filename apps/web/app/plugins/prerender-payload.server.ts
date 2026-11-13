/**
 * A prerendered page (ADR-0038) carries no store state: settings, recent boards and identity live in the visitor's
 * browser, so the client builds them from its own storage and never hydrates them from the build-time snapshot.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:rendered', () => { delete (nuxtApp.payload as { pinia?: unknown }).pinia })
})
