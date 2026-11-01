<script setup lang="ts">
/**
 * Shown when the room is empty of board: nobody connected holds it. Nothing is created in its
 * place; the board appears by itself when a participant who has it connects. The facilitator may
 * restore a board file, or, as a last resort, start a new board in this room.
 */
defineProps<{ canStart: boolean }>()
const emit = defineEmits<{ retry: [] }>()
// The relay may have lost its memory or a holder may have just arrived: ask again, quietly.
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => emit('retry'), 20_000) })
onBeforeUnmount(() => clearInterval(timer))
const { t } = useT()
const board = useBoardStore()
const { push } = useToasts()
const fileInput = ref<HTMLInputElement | null>(null)
const confirmOpen = ref(false)

async function restore(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const added = await board.importBoardFile(await file.text())
  if (added === null) push(t('boardFile.invalid'), 'warn')
  else push(t('boardFile.restored', { n: added }), 'ok')
}
</script>

<template>
  <section class="waiting" data-testid="board-waiting" role="status">
    <Icon name="lucide:hourglass" class="ico" aria-hidden="true" />
    <h1>{{ t('board.waiting.title') }}</h1>
    <p class="lead">{{ t('board.waiting.lead') }}</p>
    <button class="btn" type="button" data-testid="waiting-retry" @click="emit('retry')"><Icon name="lucide:refresh-cw" /> {{ t('board.waiting.retry') }}</button>
    <div v-if="canStart" class="actions">
      <button class="btn" type="button" data-testid="waiting-restore" @click="fileInput?.click()"><Icon name="lucide:file-up" /> {{ t('boardFile.import') }}</button>
      <input ref="fileInput" type="file" accept=".retro,application/json" class="visually-hidden" tabindex="-1" aria-hidden="true" data-testid="waiting-restore-input" @change="restore" />
      <button class="btn" type="button" data-testid="waiting-start" @click="confirmOpen = true"><Icon name="lucide:plus" /> {{ t('board.waiting.start') }}</button>
    </div>
    <ConfirmDialog v-model:open="confirmOpen" confirm-icon="lucide:play" :title="t('board.waiting.startTitle')" :message="t('board.waiting.startMsg')" :confirm-label="t('board.waiting.startOk')" @confirm="board.startBoard()" />
  </section>
</template>

<style scoped>
.waiting { margin: auto; display: grid; justify-items: center; gap: .9rem; max-width: 34rem; padding: 2rem 1rem; text-align: center; }
.ico { width: 52px; height: 52px; color: var(--accent); }
h1 { margin: 0; font-size: clamp(1.4rem, 4vw, 2rem); }
.lead { margin: 0; color: var(--muted); }
.actions { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; }
</style>
