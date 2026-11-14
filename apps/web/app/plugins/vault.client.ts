/** Picks up a sync connection made in an earlier session: its folder, and whether it is locked or needs a click. */
export default defineNuxtPlugin(() => {
  void useVaultStore().init()
})
