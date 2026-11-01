<script setup lang="ts">
import { COLUMN_ICONS, DEFAULT_COLUMN_ICON, LIMITS, NOTE_COLOR_COUNT } from '@retroboard/domain'
const { t } = useT()

const ui = useUiStore()
const board = useBoardStore()
const open = computed({ get: () => ui.dialog === 'column', set: (v) => { if (!v && ui.dialog === 'column') ui.close() } })
const editing = computed(() => board.columns.find((c) => c.id === ui.editingColumnId) ?? null)

const title = ref('')
const subtitle = ref('')
const icon = ref<string>(DEFAULT_COLUMN_ICON)
const color = ref(0)
/** Votes are possible on this column (change column-voting-scope). */
const votable = ref(true)
watch(open, (v) => {
  if (!v) return
  title.value = editing.value?.title ?? ''
  subtitle.value = editing.value?.subtitle ?? ''
  icon.value = editing.value?.icon ?? DEFAULT_COLUMN_ICON
  votable.value = editing.value?.votable !== false
  const idx = board.columns.findIndex((c) => c.id === editing.value?.id)
  color.value = editing.value ? (editing.value.color ?? idx % NOTE_COLOR_COUNT) : board.columns.length % NOTE_COLOR_COUNT
})

function save() {
  if (!title.value.trim()) return
  const payload = { title: title.value, subtitle: subtitle.value, icon: icon.value as (typeof COLUMN_ICONS)[number], color: color.value, votable: votable.value }
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
      <label class="line">
        <span><strong>{{ t('column.votable') }}</strong><small class="muted">{{ t('column.votable.hint') }}</small></span>
        <input v-model="votable" type="checkbox" role="switch" class="switch" data-testid="col-votable" />
      </label>
      <fieldset>
        <legend class="lbl">{{ t('column.color') }}</legend>
        <div class="swatches" role="radiogroup" :aria-label="t('column.color')">
          <button
            v-for="i in NOTE_COLOR_COUNT" :key="i" type="button" role="radio" class="sw" :class="{ on: color === i - 1 }" :aria-checked="color === i - 1"
            :aria-label="t('note.colorN', { n: i })" :style="{ background: `var(--note-${i - 1})` }" :data-testid="`col-color-${i - 1}`" @click="color = i - 1"
          />
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
.line { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.line span { display: grid; gap: .1rem; }
.switch { appearance: none; flex: none; width: 46px; height: 26px; border-radius: 999px; background: var(--border); position: relative; cursor: pointer; transition: background .2s; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--text); transition: transform .25s var(--ease); }
.switch:checked { background: var(--accent); }
.switch:checked::after { transform: translateX(20px); background: var(--accent-ink); }
fieldset { border: 0; padding: 0; margin: 0; }
.icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 6px; max-height: 200px; overflow: auto; padding: 2px; }
.ico { display: grid; place-items: center; aspect-ratio: 1; font-size: var(--fs-xl); border: 1.5px solid var(--border); border-radius: var(--r-control); background: var(--surface2); cursor: pointer; transition: transform .15s; }
.ico:hover { transform: scale(1.1); }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.sw { width: 34px; height: 34px; border-radius: 50%; border: 3px solid transparent; box-shadow: 0 0 0 1px var(--border); cursor: pointer; }
.sw.on { border-color: var(--text); }
.ico.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
</style>
