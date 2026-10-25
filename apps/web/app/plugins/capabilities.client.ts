/** Sends browsers that cannot run the app (no WebCrypto) to a page that says so, instead of a blank board. */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const supported = window.isSecureContext && !!globalThis.crypto?.subtle && typeof WebSocket === 'function'
  if (supported) return
  router.beforeEach((to) => (['/new', '/board'].includes(to.path) ? '/unsupported' : true))
})
