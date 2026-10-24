<script setup lang="ts">
import { COLUMN_ICONS, DEFAULT_COLUMN_ICON, LIMITS  } from '@retroboard/domain'
const { t } = useT()

const ui = useUiStore()
const board = useBoardStore()
const open = computed({ get: () => ui.dialog === 'column', set: (v) => { if (!v && ui.dialog === 'column') ui.close() } })
const editing = computed(() => board.columns.find((c) => c.id === ui.editingColumnId) ?? null)

const title = ref('')
const subtitle = ref('')
const icon = ref<string>(DEFAULT_COLUMN_ICON)
watch(open, (v) => {
  if (!v) return
  title.value = editing.value?.title ?? ''
  subtitle.value = editing.value?.subtitle ?? ''
  icon.value = editing.value?.icon ?? DEFAULT_COLUMN_ICON
})

function save() {
  if (!title.value.trim()) return
  const payload = { title: title.value, subtitle: subtitle.value, icon: icon.value as (typeof COLUMN_ICONS)[number] }
  if (editing.value) board.commands.updateColumn(editing.value.id, payload)
  else board.commands.addColumn(payload)
  ui.close()
}
</script>

<template>
  <BaseDialog v-model:open="open" :title="editing ? t('column.edit') : t('column.new')" width="560px">
    <form id="col-form" class="form" @submit.prevent="save">
      <label class="lbl">{{ t('column.titleLabel') }}
        <input v-model="title" class="field" :maxlength="LIMITS.columnTitle" required autofocus data-testid="col-title" :placeholder="t('column.titlePh')" />
      </label>
      <label class="lbl">{{ t('column.subtitleLabel') }}
        <input v-model="subtitle" class="field" :maxlength="LIMITS.columnSubtitle" data-testid="col-subtitle" :placeholder="t('column.subtitlePh')" />
      </label>
      <fieldset>
        <legend class="lbl">{{ t('column.icon') }}</legend>
        <div class="icons" role="radiogroup" :aria-label="t('column.icon')">
          <button v-for="i in COLUMN_ICONS" :key="i" type="button" role="radio" :aria-checked="icon === i" :aria-label="i" class="ico" :class="{ on: icon === i }" @click="icon = i">
            <Icon :name="`lucide:${i}`" />
          </button>
        </div>
      </fieldset>
    </form>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="ui.close()">{{ t('common.cancel') }}</button>
      <button class="btn btn-primary" type="submit" form="col-form" data-testid="col-save"><Icon name="lucide:check" /> {{ t('common.save') }}</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.form { display: grid; gap: 1rem; }
fieldset { border: 0; padding: 0; margin: 0; }
.icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 6px; max-height: 200px; overflow: auto; padding: 2px; }
.ico { display: grid; place-items: center; aspect-ratio: 1; font-size: 1.25rem; border: 1.5px solid var(--border); border-radius: 10px; background: var(--surface2); cursor: pointer; transition: transform .15s; }
.ico:hover { transform: scale(1.1); }
.ico.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
</style>
