<script setup lang="ts">
import { LIMITS } from '@retroboard/domain'
import { type ColumnItem, suggestClusterTitles } from '@retroboard/application'
const { t } = useT()

const props = defineProps<{ item: Extract<ColumnItem, { kind: 'group' }> }>()
const board = useBoardStore()
const ui = useUiStore()
const title = ref(props.item.group.title ?? '')
watch(() => props.item.group.title, (t) => { title.value = t ?? '' })

const closeNow = () => { ui.openGroupId = null }

// Spring open and close (change cluster-reveal-motion): the panel grows out of the stack and shrinks back
// into it (FLIP with the Web Animations API, under 400 ms). Reduced motion: no animation at all.
const panelEl = ref<HTMLElement | null>(null)
const SPRING = 'linear(0, 0.42 12%, 0.86 28%, 1.06 44%, 1.02 62%, 1 80%, 1)'
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const stackRect = () => document.querySelector(`[data-source-id="${props.item.group.id}"]`)?.getBoundingClientRect() ?? null
function flip(toStack: boolean): Animation | null {
  const el = panelEl.value
  const from = stackRect()
  if (!el || !from || reduced()) return null
  const to = el.getBoundingClientRect()
  if (!to.width || !to.height) return null
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  const small = `translate(${dx}px, ${dy}px) scale(${Math.min(1, from.width / to.width)}, ${Math.min(1, from.height / to.height)})`
  return el.animate(
    toStack ? [{ transform: 'none', opacity: 1 }, { transform: small, opacity: 0 }] : [{ transform: small, opacity: 0.4 }, { transform: 'none', opacity: 1 }],
    toStack ? { duration: 180, easing: 'ease-in', fill: 'forwards' } : { duration: 340, easing: SPRING },
  )
}
let closing = false
function close() {
  if (closing) return
  const a = flip(true)
  if (!a) return closeNow()
  closing = true
  a.onfinish = closeNow
  a.oncancel = closeNow
}
onMounted(() => { flip(false) })
function saveTitle() {
  if (title.value.trim() !== (props.item.group.title ?? '')) board.commands.renameGroup(props.item.group.id, title.value)
}
/** Title ideas from the cluster's notes (computed locally). */
const suggestions = computed(() => suggestClusterTitles(props.item.notes.map((n) => n.text)).filter((s) => s !== (props.item.group.title ?? '')))
function useSuggestion(s: string) { title.value = s; board.commands.renameGroup(props.item.group.id, s) }
/** Touch-friendly alternative to dropping a cluster on another: other clusters of the same column. */
const others = computed(() => board.itemsFor(props.item.group.columnId, 'time').filter((i) => i.kind === 'group' && i.group.id !== props.item.group.id) as Extract<ColumnItem, { kind: 'group' }>[])
function mergeInto(target: string) { board.commands.mergeGroups(props.item.group.id, target); ui.openGroupId = target }
const gate = computed(() => board.availability('action.add'))
function toAction() { const id = props.item.group.id; const text = props.item.title; closeNow(); ui.openActionFrom({ sourceId: id, text, owner: '' }) }
function dissolve() { board.commands.dissolveGroup(props.item.group.id); closeNow() }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="scrim" @click.self="close">
    <section ref="panelEl" class="panel" role="dialog" :aria-label="t('group.panel')" data-testid="group-panel">
      <header>
        <Icon name="lucide:layers" class="gi" />
        <label class="sr-only" for="gtitle">{{ t('group.titleLabel') }}</label>
        <input
          id="gtitle" v-model="title" class="gtitle" :maxlength="LIMITS.groupTitle" :placeholder="item.notes[0]?.text" data-testid="group-title"
          @blur="saveTitle" @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
        <span v-if="!board.countsHidden" class="pill mono"><Icon name="lucide:thumbs-up" /> {{ item.votes }}</span>
        <button class="mini-btn" type="button" :aria-label="t('group.closeLabel')" data-testid="group-close" @click="close"><Icon name="lucide:x" /></button>
      </header>
      <div v-if="suggestions.length" class="sugg" role="group" :aria-label="t('cluster.suggestions')" data-testid="cluster-suggestions">
        <span class="muted small">{{ t('cluster.suggestions') }}</span>
        <button v-for="s in suggestions" :key="s" type="button" class="chip" data-testid="cluster-suggestion" @click="useSuggestion(s)">{{ s }}</button>
      </div>
      <TransitionGroup name="note" tag="div" class="grid">
        <NoteCard v-for="n in item.notes" :key="n.id" :note="n" in-group />
      </TransitionGroup>
      <footer>
        <details v-if="others.length" class="merge">
          <summary class="btn btn-sm btn-ghost" data-testid="cluster-merge"><Icon name="lucide:combine" /> {{ t('cluster.mergeInto') }}</summary>
          <div class="merge-list" role="group" :aria-label="t('cluster.mergeInto')">
            <button v-for="o in others" :key="o.group.id" class="dd-item" type="button" :data-testid="`merge-into-${o.group.id}`" @click="mergeInto(o.group.id)">{{ o.title }} ({{ o.notes.length }})</button>
          </div>
        </details>
        <button class="btn btn-sm btn-ghost" type="button" :disabled="!gate.allowed" data-testid="group-create-action" @click="toAction"><Icon name="lucide:list-checks" /> {{ t('note.toAction') }}</button>
        <button class="btn btn-sm btn-ghost" type="button" data-testid="group-dissolve" @click="dissolve"><Icon name="lucide:ungroup" /> {{ t('group.dissolve') }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.scrim { position: absolute; inset: 0; z-index: 20; display: grid; align-items: start; padding: .6rem; background: color-mix(in oklab, var(--bg) 62%, transparent); backdrop-filter: blur(2px); border-radius: inherit; animation: fade-in .2s; }
.panel { position: relative; display: grid; gap: .8rem; padding: .9rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-card); box-shadow: var(--shadow-2); max-height: 100%; overflow: auto; }
header { display: flex; align-items: center; gap: .5rem; }
.gi { color: var(--accent); font-size: 1.2rem; flex: none; }
.gtitle { flex: 1; min-width: 0; padding: .3rem .4rem; border: 1px solid transparent; border-radius: 8px; background: transparent; font-family: var(--f-display); font-size: 1.15rem; font-weight: 600; color: var(--text); text-overflow: ellipsis; }
.gtitle:hover, .gtitle:focus { border-color: var(--border); background: var(--surface2); outline: none; }
.grid { position: relative; display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--note-w, 150px), 1fr)); gap: .75rem; }
footer { display: flex; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
.sugg { display: flex; gap: .35rem; flex-wrap: wrap; align-items: center; }
.small { font-size: .8rem; }
.merge summary { list-style: none; cursor: pointer; }
.merge summary::-webkit-details-marker { display: none; }
.merge-list { display: grid; gap: 2px; margin-top: .35rem; }
.chip { padding: .2rem .6rem; border: 1px solid var(--border); border-radius: 999px; background: var(--surface2); color: var(--text); cursor: pointer; font: inherit; font-size: .85rem; }
.chip:hover { border-color: var(--accent); }
</style>
