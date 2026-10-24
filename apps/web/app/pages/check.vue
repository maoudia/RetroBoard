<script setup lang="ts">
import { curves, open, randomKey, seal, utf8 } from '@retroboard/crypto'

const { t } = useT()
useHead({ title: computed(() => t('check.pageTitle')) })

type Status = 'pending' | 'ok' | 'fallback' | 'fail'
const rows = reactive<Record<'secure' | 'aes' | 'curves' | 'socket', Status>>({ secure: 'pending', aes: 'pending', curves: 'pending', socket: 'pending' })
const done = computed(() => Object.values(rows).every((s) => s !== 'pending'))
const ready = computed(() => done.value && Object.values(rows).every((s) => s !== 'fail'))

onMounted(async () => {
  rows.secure = window.isSecureContext && !!globalThis.crypto?.subtle ? 'ok' : 'fail'
  rows.socket = typeof WebSocket === 'function' ? 'ok' : 'fail'
  try {
    const key = randomKey(); const aad = utf8('check')
    const back = await open(key, await seal(key, utf8('ok'), aad), aad)
    rows.aes = back && back.length === 2 ? 'ok' : 'fail'
  } catch { rows.aes = 'fail' }
  try { rows.curves = (await curves()).name === 'webcrypto' ? 'ok' : 'fallback' } catch { rows.curves = 'fail' }
})
</script>

<template>
  <main class="check" data-testid="browser-check" :data-ready="done ? String(ready) : undefined">
    <NuxtLink to="/" class="back"><Icon name="lucide:arrow-left" /> {{ t('check.back') }}</NuxtLink>
    <h1>{{ t('check.title') }}</h1>
    <p class="lead">{{ t('check.lead') }}</p>
    <ul>
      <li v-for="(status, id) in rows" :key="id" :data-testid="`check-${id}`" :data-status="status">
        <Icon :name="status === 'fail' ? 'lucide:x-circle' : status === 'pending' ? 'lucide:loader' : 'lucide:check-circle'" />
        <span>{{ t(`check.${id}`) }}</span>
        <em>{{ t(`check.status.${status}`) }}</em>
      </li>
    </ul>
    <p v-if="done" class="verdict" role="status">{{ t(ready ? 'check.ready' : 'check.notReady') }}</p>
    <LegalLinks />
  </main>
</template>

<style scoped>
.check { max-width: 40rem; margin: 0 auto; padding: 2rem 1rem; }
.back { display: inline-flex; gap: .4rem; align-items: center; color: inherit; }
ul { list-style: none; padding: 0; display: grid; gap: .5rem; }
li { display: grid; grid-template-columns: auto 1fr auto; gap: .75rem; align-items: center; padding: .75rem 1rem; border: 1px solid var(--line, #d2d2d7); border-radius: 12px; }
li[data-status="fail"] { border-color: #c4281c; }
em { font-style: normal; opacity: .8; }
.verdict { font-weight: 600; }
</style>
