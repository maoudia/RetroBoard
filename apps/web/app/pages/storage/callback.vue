<script setup lang="ts">
/**
 * Where Microsoft sends the person back after "Sign in with Microsoft" (change user-drive-storage, group 3): the code and the
 * state arrive in the query string, the vault runtime trades the code for tokens in the OneDrive worker, and the person lands
 * on the page they left, with Preferences > Sync open to go on (password, or a message if the sign-in did not complete).
 */
const { t } = useT()
const vault = useVaultStore()
const router = useRouter()
const ui = useUiStore()
const failed = ref(false)

onMounted(async () => {
  const outcome = await vault.completeSignIn(window.location.search)
  // A silent renewal that found no Microsoft session is already on its way to the sign-in page.
  if (outcome.kind === 'redirecting') return
  failed.value = outcome.kind === 'failed'
  if (outcome.kind !== 'ignored') ui.open('profile')
  await router.replace(outcome.kind === 'ignored' ? '/boards' : outcome.returnTo)
})
</script>

<template>
  <ServicePage icon="lucide:refresh-cw" :title="t('sync.callback.title')" :lead="t('sync.callback.title')" testid="storage-callback">
    <p v-if="failed" class="fail" role="alert">{{ t('sync.error.signin') }}</p>
  </ServicePage>
</template>

<style scoped>
.fail { margin: 0; color: var(--danger); font-weight: 600; }
</style>
