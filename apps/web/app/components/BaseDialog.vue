<script setup lang="ts">
const { t } = useT()
const props = withDefaults(defineProps<{ open: boolean; title: string; width?: string; closable?: boolean }>(), {
  width: '520px', closable: true,
})
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const el = ref<HTMLDialogElement | null>(null)
/** Set when the parent closed the dialog: its 'close' event must not be reported back as a user close. */
let closingFromProp = false

function sync() {
  const d = el.value
  if (!d) return
  if (props.open && !d.open) d.showModal()
  else if (!props.open && d.open) { closingFromProp = true; d.close() }
}

/**
 * The 'close' event is dispatched asynchronously. If the parent closed then reopened the dialog
 * in between (a second confirmation right after the first), reporting it would cancel the new one.
 */
function onClose() {
  if (closingFromProp) { closingFromProp = false; sync(); return }
  emit('update:open', false)
}
watch(() => props.open, sync, { flush: 'post' })
onMounted(sync)

function onBackdrop(e: MouseEvent) {
  if (props.closable && e.target === el.value) el.value?.close()
}
</script>

<template>
  <dialog
    ref="el" class="dlg" :style="{ '--dlg-w': width }" :aria-label="title"
    @close="onClose" @cancel="(e) => { if (!closable) e.preventDefault() }" @click="onBackdrop"
  >
    <template v-if="open">
      <header class="dlg-head">
        <h2>{{ title }}</h2>
        <button v-if="closable" class="mini-btn" type="button" :aria-label="t('common.close')" @click="el?.close()">
          <Icon name="lucide:x" />
        </button>
      </header>
      <div class="dlg-body"><slot /></div>
      <footer v-if="$slots.footer" class="dlg-foot"><slot name="footer" /></footer>
    </template>
  </dialog>
</template>

<style scoped>
.dlg-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.25rem .6rem; }
.dlg-head h2 { font-size: 1.5rem; }
.dlg-body { padding: .5rem 1.25rem 1.1rem; overflow: auto; display: grid; gap: 1rem; }
.dlg-foot { display: flex; justify-content: flex-end; gap: .6rem; padding: .9rem 1.25rem; border-top: 1px solid var(--border); background: color-mix(in oklab, var(--bg) 40%, var(--surface)); }
</style>
