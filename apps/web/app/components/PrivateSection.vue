<script setup lang="ts">
import { similarIdeas } from '@retroboard/application'
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
/** Writing closed by the current phase: greyed composer with the reason (facilitators keep it open). */
const gate = computed(() => board.availability('note.addMany'))
const closed = computed(() => !gate.value.allowed)
/** Look-alike ideas already published in this column, computed on this device while I type. */
const similar = computed(() => (text.value.trim().length >= 4 ? similarIdeas(text.value, board.snapshot?.notes ?? [], props.column.id, 1)[0] ?? null : null))
function showSimilar(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-anchor="${id}"]`)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}

function add() {
  if (drafts.add(props.column.id, text.value, props.colorIndex)) text.value = ''
}
/** Enter: draft. Shift+Enter: new line. Ctrl/Cmd+Enter: publish now. Escape: clear. */
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    const d = drafts.add(props.column.id, text.value, props.colorIndex)
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
      <button v-if="mine.length" class="btn btn-sm btn-primary" type="button" :disabled="board.locked || closed" :data-testid="`publish-${column.id}`" @click="publish(mine.map((d) => d.id))">
        <Icon name="lucide:send" /> {{ t('private.publish') }} ({{ mine.length }})
      </button>
    </header>

    <ul v-if="mine.length" class="drafts">
      <li v-for="d in mine" :key="d.id" :data-draft-id="d.id" class="draft" :style="{ '--c': `var(--note-${d.color})` }">
        <p>{{ d.text }}</p>
        <span class="acts">
          <button class="mini-btn" type="button" :aria-label="t('private.publishOne')" :disabled="board.locked || closed" @click="publish([d.id])"><Icon name="lucide:send" /></button>
          <button class="mini-btn" type="button" :aria-label="t('private.deleteDraft')" @click="drafts.remove(d.id)"><Icon name="lucide:trash" /></button>
        </span>
      </li>
    </ul>

    <GatedHint :availability="gate" what="gated.write" :testid="`gated-${column.id}`" />
    <label class="composer" :class="{ gated: closed }" :style="{ '--c': `var(--note-${colorIndex})` }">
      <span class="sr-only">{{ t('private.newIn', { title: column.title }) }}</span>
      <textarea
        v-model="text" :maxlength="LIMITS.noteText" rows="2" :disabled="board.locked || closed" :data-testid="`draft-${column.id}`"
        :aria-describedby="gate.closedBy ? `gated-${column.id}` : undefined"
        :placeholder="board.locked ? t('private.locked') : closed ? t('gated.write.placeholder') : t('private.placeholder')"
        @keydown="onKey"
      />
      <small>{{ themeText(theme.theme).privateHint }} <span class="keys">{{ t('private.keys') }}</span></small>
    </label>
    <p v-if="similar" class="similar" role="status" :data-testid="`similar-${column.id}`">
      <Icon name="lucide:copy-check" /> {{ t('private.similar') }}
      <button class="link" type="button" @click="showSimilar(similar.id)">« {{ similar.text }} »</button>
    </p>
  </section>
</template>

<style scoped>
.priv { display: grid; gap: .6rem; padding: .75rem; border-top: 1px dashed var(--border); background: color-mix(in oklab, var(--bg) 50%, var(--surface)); border-radius: 0 0 var(--r-card) var(--r-card); }
header { display: flex; align-items: center; justify-content: space-between; min-height: 30px; }
.title { display: inline-flex; align-items: center; gap: .4rem; font-weight: 700; font-size: .8rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
/* Keyboard shortcuts mean nothing on touch screens. */
@media (pointer: coarse) { .keys { display: none; } }
.similar { margin: 0; display: flex; flex-wrap: wrap; gap: .3rem; align-items: center; font-size: .85rem; color: var(--muted); }
.similar .link { overflow-wrap: anywhere; text-align: left; border: 0; background: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font: inherit; font-weight: 600; }
.drafts { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; max-height: 22vh; overflow: auto; }
.draft { display: flex; justify-content: space-between; gap: .5rem; padding: .5rem .6rem; border: 1.5px dashed var(--c); border-radius: 8px; animation: pop-in .25s var(--ease); }
.draft p { overflow-wrap: anywhere; white-space: pre-wrap; font-size: .92rem; }
.acts { display: flex; flex: none; color: var(--muted); }
.composer { display: grid; gap: .3rem; padding: .6rem; border-radius: 6px; background: var(--c); color: var(--note-ink); box-shadow: var(--shadow-1); transform: rotate(-.6deg); }
.composer textarea { width: 100%; min-height: 3.2rem; resize: none; padding: 0; border: 0; background: transparent; color: inherit; outline: none; font-weight: 500; }
.composer textarea::placeholder { color: color-mix(in oklab, var(--note-ink) 62%, transparent); }
.composer small { font-size: .7rem; opacity: .7; }
.composer.gated { background: var(--gated-bg); color: var(--muted); box-shadow: none; transform: none; border: 1.5px dashed var(--gated-line); }
.composer.gated textarea::placeholder { color: var(--muted); }
.composer:focus-within { box-shadow: 0 0 0 3px var(--accent), var(--shadow-1); }
</style>
