<script setup lang="ts">
import { LIMITS } from '@retroboard/domain'
import type { Column } from '@retroboard/domain'
const { t } = useT()

const props = defineProps<{ column: Column; colorIndex: number }>()
const board = useBoardStore()
const drafts = useDraftsStore()
const theme = useThemeStore()
const { publish } = usePublish()
const text = ref('')
const mine = computed(() => drafts.forColumn(props.column.id))

function add() {
  if (drafts.add(props.column.id, text.value)) text.value = ''
}
/** Enter: draft. Shift+Enter: new line. Ctrl/Cmd+Enter: publish now. Escape: clear. */
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    const d = drafts.add(props.column.id, text.value)
    if (d) { text.value = ''; publish([d.id]) }
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    add()
  } else if (e.key === 'Escape' && text.value) {
    e.preventDefault()
    e.stopPropagation()
    text.value = ''
  }
}
</script>

<template>
  <section class="priv" :aria-label="t('private.section', { title: column.title })">
    <header>
      <span class="title"><Icon name="lucide:eye-off" /> {{ t('private.title') }}</span>
      <button v-if="mine.length" class="btn btn-sm btn-primary" type="button" :disabled="board.locked" :data-testid="`publish-${column.id}`" @click="publish(mine.map((d) => d.id))">
        <Icon name="lucide:send" /> {{ t('private.publish') }} ({{ mine.length }})
      </button>
    </header>

    <ul v-if="mine.length" class="drafts">
      <li v-for="d in mine" :key="d.id" :data-draft-id="d.id" class="draft" :style="{ '--c': `var(--note-${d.color})` }">
        <p>{{ d.text }}</p>
        <span class="acts">
          <button class="mini-btn" type="button" :aria-label="t('private.publishOne')" :disabled="board.locked" @click="publish([d.id])"><Icon name="lucide:send" /></button>
          <button class="mini-btn" type="button" :aria-label="t('private.deleteDraft')" @click="drafts.remove(d.id)"><Icon name="lucide:trash" /></button>
        </span>
      </li>
    </ul>

    <label class="composer" :style="{ '--c': `var(--note-${colorIndex})` }">
      <span class="sr-only">{{ t('private.newIn', { title: column.title }) }}</span>
      <textarea
        v-model="text" :maxlength="LIMITS.noteText" rows="2" :disabled="board.locked" :data-testid="`draft-${column.id}`"
        :placeholder="board.locked ? t('private.locked') : t('private.placeholder')"
        @keydown="onKey"
      />
      <small>{{ themeText(theme.theme).privateHint }} {{ t('private.keys') }}</small>
    </label>
  </section>
</template>

<style scoped>
.priv { display: grid; gap: .6rem; padding: .75rem; border-top: 1px dashed var(--border); background: color-mix(in oklab, var(--bg) 50%, var(--surface)); border-radius: 0 0 var(--r-card) var(--r-card); }
header { display: flex; align-items: center; justify-content: space-between; min-height: 30px; }
.title { display: inline-flex; align-items: center; gap: .4rem; font-weight: 700; font-size: .8rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.drafts { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; max-height: 22vh; overflow: auto; }
.draft { display: flex; justify-content: space-between; gap: .5rem; padding: .5rem .6rem; border: 1.5px dashed var(--c); border-radius: 8px; animation: pop-in .25s var(--ease); }
.draft p { overflow-wrap: anywhere; white-space: pre-wrap; font-size: .92rem; }
.acts { display: flex; flex: none; color: var(--muted); }
.composer { display: grid; gap: .3rem; padding: .6rem; border-radius: 6px; background: var(--c); color: var(--note-ink); box-shadow: var(--shadow-1); transform: rotate(-.6deg); }
.composer textarea { width: 100%; min-height: 3.2rem; resize: none; padding: 0; border: 0; background: transparent; color: inherit; outline: none; font-weight: 500; }
.composer textarea::placeholder { color: color-mix(in oklab, var(--note-ink) 62%, transparent); }
.composer small { font-size: .7rem; opacity: .7; }
.composer:focus-within { box-shadow: 0 0 0 3px var(--accent), var(--shadow-1); }
</style>
