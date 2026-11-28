<script setup lang="ts">
import { LIMITS } from '@retroboard/domain'
import { type ColumnItem, suggestClusterTitles } from '@retroboard/application'
const { t } = useT()

const props = defineProps<{ item: Extract<ColumnItem, { kind: 'group' }> }>()
const board = useBoardStore()
const ui = useUiStore()
const title = ref(props.item.group.title ?? '')
watch(() => props.item.group.title, (t) => { title.value = t ?? '' })

const acts = useGroupActions(() => props.item)
const closeNow = () => ui.closeGroup(props.item.group.columnId)

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
/** Closing the panel by hand (button, scrim, Escape) hands focus back to its stack. */
function backToStack() { void nextTick(() => document.querySelector<HTMLElement>(`[data-source-id="${CSS.escape(props.item.group.id)}"]`)?.focus({ preventScroll: true })) }
function close() {
  if (closing) return
  const done = () => { closeNow(); backToStack() }
  const a = flip(true)
  if (!a) return done()
  closing = true
  a.onfinish = done
  a.oncancel = done
}
const titleEl = ref<HTMLInputElement | null>(null)
onMounted(() => {
  flip(false)
  // Only the panel just opened takes focus; Rename from the group menu goes straight to the title.
  if (ui.renameGroupId === props.item.group.id) { ui.renameGroupId = null; titleEl.value?.focus({ preventScroll: true }); titleEl.value?.select() }
  else panelEl.value?.focus({ preventScroll: true })
})
function saveTitle() {
  if (title.value.trim() !== (props.item.group.title ?? '')) board.commands.renameGroup(props.item.group.id, title.value)
}
/** Title ideas from the cluster's notes (computed locally). */
const suggestions = computed(() => suggestClusterTitles(props.item.notes.map((n) => n.text)).filter((s) => s !== (props.item.group.title ?? '')))
function useSuggestion(s: string) { title.value = s; board.commands.renameGroup(props.item.group.id, s) }
/** Escape closes the panel that has focus, else the one opened last; a menu or a dialog opened from here takes its own Escape. */
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || ui.dialog) return
  const active = document.activeElement
  if (active?.closest('[role="menu"], .dd-panel, [role="dialog"]:not([data-testid="group-panel"])')) return
  const owner = active?.closest('[data-testid="group-panel"]')
  if (owner ? owner === panelEl.value : ui.lastGroupColumn === props.item.group.columnId) close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="scrim" @click.self="close">
    <section ref="panelEl" class="panel" role="dialog" tabindex="-1" :aria-label="t('group.panel')" data-testid="group-panel">
      <header>
        <Icon name="lucide:layers" class="gi" />
        <label class="sr-only" for="gtitle">{{ t('group.titleLabel') }}</label>
        <input
          id="gtitle" ref="titleEl" v-model="title" class="gtitle" :maxlength="LIMITS.groupTitle" :placeholder="item.notes[0]?.text" data-testid="group-title"
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
        <details v-if="acts.has('mergeInto')" class="merge">
          <summary class="btn btn-sm btn-ghost" data-testid="cluster-merge"><Icon name="lucide:combine" /> {{ t('cluster.mergeInto') }}</summary>
          <div class="merge-list" role="group" :aria-label="t('cluster.mergeInto')">
            <button v-for="o in acts.mergeTargets.value" :key="o.group.id" class="dd-item" type="button" :data-testid="`merge-into-${o.group.id}`" @click="acts.mergeInto(o.group.id)">{{ o.title }} ({{ o.notes.length }})</button>
          </div>
        </details>
        <details v-if="acts.has('moveTo')" class="merge">
          <summary class="btn btn-sm btn-ghost" data-testid="cluster-move"><Icon name="lucide:arrow-right-left" /> {{ t('cluster.moveTo') }}</summary>
          <div class="merge-list" role="group" :aria-label="t('cluster.moveTo')">
            <button v-for="c in acts.otherColumns.value" :key="c.id" class="dd-item" type="button" :data-testid="`move-group-to-${c.id}`" @click="acts.moveTo(c.id)"><Icon :name="`lucide:${c.icon}`" /> {{ c.title }}</button>
          </div>
        </details>
        <details v-if="acts.has('recolor')" class="merge">
          <summary class="btn btn-sm btn-ghost" data-testid="cluster-recolor"><Icon name="lucide:palette" /> {{ t('cluster.recolor') }}</summary>
          <ColorPicker :current="null" swatch-testid="cluster-color" more-testid="cluster-palette" @pick="acts.recolor($event)" @more="acts.morePalette()" />
        </details>
        <button v-if="acts.has('toAction')" class="btn btn-sm btn-ghost" type="button" :disabled="!!acts.actionTitle.value" data-testid="group-create-action" @click="acts.toAction"><Icon name="lucide:list-checks" /> {{ t('note.toAction') }}</button>
        <button v-if="acts.has('pin')" class="btn btn-sm btn-ghost" type="button" data-testid="group-pin" @click="acts.togglePin">
          <Icon :name="item.group.pinned ? 'lucide:pin-off' : 'lucide:pin'" /> {{ item.group.pinned ? t('note.unpin') : t('note.pin') }}
        </button>
        <button v-if="acts.has('freeze')" class="btn btn-sm btn-ghost" type="button" data-testid="group-freeze" @click="acts.toggleFreeze">
          <Icon :name="item.group.frozen ? 'lucide:flame' : 'lucide:snowflake'" /> {{ item.group.frozen ? t('note.unfreeze') : t('note.freeze') }}
        </button>
        <button v-if="acts.has('dissolve')" class="btn btn-sm btn-ghost" type="button" :disabled="item.group.frozen" :title="item.group.frozen ? t('error.frozen') : undefined" data-testid="group-dissolve" @click="acts.dissolve"><Icon name="lucide:ungroup" /> {{ t('group.dissolve') }}</button>
      </footer>
      <ConfirmDialog v-model:open="acts.dissolveAsk.value" danger :title="t('group.dissolve.title')" :message="t('group.dissolve.voted')" :confirm-label="t('group.dissolve')" confirm-icon="lucide:ungroup" @confirm="acts.doDissolve" />
    </section>
  </div>
</template>

<style scoped>
.scrim { position: absolute; inset: 0; z-index: 20; display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; padding: .6rem; background: color-mix(in oklab, var(--bg) 62%, transparent); backdrop-filter: blur(2px); border-radius: inherit; animation: fade-in .2s; }
.panel:focus { outline: none; }
.panel { position: relative; display: grid; grid-template-columns: minmax(0, 1fr); gap: .8rem; padding: .9rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-card); box-shadow: var(--shadow-2); max-height: 100%; min-width: 0; overflow-x: hidden; overflow-y: auto; container-type: inline-size; }
header { display: flex; align-items: center; gap: .5rem; }
.gi { color: var(--accent); font-size: var(--fs-xl); flex: none; }
.gtitle { flex: 1; min-width: 0; padding: .3rem .4rem; border: 1px solid transparent; border-radius: var(--r-sm); background: transparent; font-family: var(--f-display); font-size: var(--fs-lg); font-weight: 600; color: var(--text); text-overflow: ellipsis; }
.gtitle:hover, .gtitle:focus { border-color: var(--border); background: var(--surface2); outline: none; }
.grid { position: relative; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 9.5rem), 1fr)); gap: .6rem; min-width: 0; align-items: start; }
.grid > :deep(*) { min-width: 0; }
/* Actions wrap on the panel width, never past it: no sideways scroll to reach them. */
footer { display: flex; flex-wrap: wrap; gap: .35rem; min-width: 0; }
footer > :deep(.btn), footer > .merge { flex: 1 1 9rem; min-width: 0; }
footer :deep(.btn) { white-space: normal; text-align: start; justify-content: flex-start; height: auto; min-height: 32px; }
.merge[open] { flex-basis: 100%; }
.sugg { display: flex; gap: .35rem; flex-wrap: wrap; align-items: center; }
.small { font-size: var(--fs-xs); }
.merge summary { list-style: none; cursor: pointer; }
.merge summary::-webkit-details-marker { display: none; }
.merge-list { display: grid; gap: 2px; margin-top: .35rem; }
.chip { padding: .2rem .6rem; border: 1px solid var(--border); border-radius: 999px; background: var(--surface2); color: var(--text); cursor: pointer; font: inherit; font-size: var(--fs-sm); }
.chip:hover { border-color: var(--accent); }
</style>
