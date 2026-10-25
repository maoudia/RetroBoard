<script setup lang="ts">
import { LIMITS } from '@retroboard/domain'
import { hasChosen, showNameAfterTyping } from '~/utils/show-name'
const { t } = useT()

const ui = useUiStore()
const identity = useIdentityStore()
const board = useBoardStore()
const open = computed({ get: () => ui.dialog === 'name', set: (v) => { if (!v && ui.dialog === 'name') ui.close() } })
const name = ref('')
const show = ref(false)
/** The person set the checkbox themselves (or had chosen before): stop following the name field. */
const touched = ref(false)
watch(open, (v) => {
  if (!v) return
  name.value = identity.name
  touched.value = hasChosen(identity)
  show.value = touched.value ? identity.showName : showNameAfterTyping(name.value, false, false)
})
watch(name, (n) => { show.value = showNameAfterTyping(n, touched.value, show.value) })

function save() {
  identity.set({ name: name.value, showName: show.value })
  board.updateIdentity(identity.identity)
  ui.close()
}
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('name.title')" width="460px">
    <form id="name-form" class="form" @submit.prevent="save">
      <p class="muted">{{ t('name.intro') }}</p>
      <input v-model="name" class="field" :maxlength="LIMITS.displayName" :placeholder="t('name.placeholder')" autocomplete="off" autofocus data-testid="name-input" :aria-label="t('name.label')" />
      <label class="check"><input v-model="show" type="checkbox" data-testid="name-show" @change="touched = true" /> {{ t('name.show') }}</label>
    </form>
    <template #footer>
      <button class="btn btn-primary" type="submit" form="name-form" data-testid="name-save">{{ t('name.enter') }} <Icon name="lucide:arrow-right" /></button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.form { display: grid; gap: .9rem; }
.check { display: flex; gap: .6rem; align-items: flex-start; font-size: .92rem; }
.check input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--accent); flex: none; }
</style>
