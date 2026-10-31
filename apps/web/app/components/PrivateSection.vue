<script setup lang="ts">
import { similarIdeas } from '@retroboard/application'
import { NOTE_COLOR_COUNT, type Column } from '@retroboard/domain'
import { WRITE_SIZES } from '~/stores/ui'
const { t } = useT()

const props = defineProps<{ column: Column; colorIndex: number }>()
const board = useBoardStore()
const drafts = useDraftsStore()
const identity = useIdentityStore()
const ui = useUiStore()
const { publish } = usePublish()
const text = computed({ get: () => drafts.compose(props.column.id), set: (v: string) => drafts.setCompose(props.column.id, v) })
/** On touch screens the keyboard's return key adds a line; the buttons act. */
const coarse = ref(false)
onMounted(() => { coarse.value = window.matchMedia('(pointer: coarse)').matches })
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

/** Signature of the next notes: my name, or anonymous. One click switches (no name yet: opens the name dialog). */
const signed = computed(() => identity.showName && identity.name.trim() !== '')
function setSignature(named: boolean) {
  if (named && identity.name.trim() === '') { ui.open('name'); return }
  if (signed.value === named) return
  identity.set({ name: identity.name, showName: named })
  board.updateIdentity(identity.identity)
}
/** Colour of the next notes: the column default until the author picks another swatch (kept for the following notes). */
const picked = ref<number | null>(null)
const colour = computed(() => picked.value ?? props.colorIndex)
const colorsOpen = ref(false)
function add() {
  if (drafts.add(props.column.id, text.value, colour.value)) text.value = ''
}
function publishNow() {
  const d = drafts.add(props.column.id, text.value, colour.value)
  if (d) { text.value = ''; publish([d.id]) }
}
/** Enter: draft. Shift+Enter: new line. Ctrl/Cmd+Enter: publish now. Escape: clear. */
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    publishNow()
  } else if (e.key === 'Enter' && !e.shiftKey && !coarse.value) {
    e.preventDefault()
    add()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    // First Escape clears what was typed, the next one leaves the field (so board shortcuts work again).
    if (text.value) text.value = ''
    else (e.target as HTMLElement).blur()
  }
}
</script>

<template>
  <section class="priv" :data-area="ui.writeSize" :aria-label="t('private.section', { title: column.title })">
    <header>
      <span class="title"><Icon name="lucide:eye-off" /> {{ t('private.title') }}</span>
      <Dropdown menu>
        <template #trigger="{ toggle, open }">
          <button class="mini-btn" type="button" aria-haspopup="menu" :aria-expanded="open" :aria-label="t('private.area')" :title="t('private.area')" :data-testid="`area-menu-${column.id}`" @click="toggle">
            <Icon name="lucide:text-cursor-input" />
          </button>
        </template>
        <template #default="{ close }">
          <button v-for="z in WRITE_SIZES" :key="z" class="dd-item" type="button" role="menuitemradio" :aria-checked="ui.writeSize === z" :data-testid="`area-${z}-${column.id}`" @click="ui.setWriteSize(board.roomId, z); close()">
            <Icon :name="ui.writeSize === z ? 'lucide:check' : 'lucide:minus'" /> {{ t(`private.area.${z}` as never) }}
          </button>
        </template>
      </Dropdown>
      <button v-if="mine.length" class="btn btn-sm btn-primary" type="button" :disabled="board.locked || closed" :data-testid="`publish-${column.id}`" @click="publish(mine.map((d) => d.id))">
        <Icon name="lucide:send" /> {{ t('private.publish') }} ({{ mine.length }})
      </button>
    </header>

    <ul v-if="mine.length" class="drafts">
      <li v-for="d in mine" :key="d.id" :data-draft-id="d.id" class="draft" :style="{ '--c': `var(--note-${d.color})` }">
        <p>{{ d.text }}</p>
        <span class="acts">
          <button class="mini-btn" type="button" :aria-label="t('private.publishOne')" :disabled="board.locked || closed" :data-testid="`draft-publish-${d.id}`" @click="publish([d.id])"><Icon name="lucide:send" /></button>
          <button class="mini-btn" type="button" :aria-label="t('private.deleteDraft')" :data-testid="`draft-dismiss-${d.id}`" @click="drafts.remove(d.id)"><Icon name="lucide:trash" /></button>
        </span>
      </li>
    </ul>

    <GatedHint :availability="gate" what="gated.write" :testid="`gated-${column.id}`" />
    <label class="composer" :class="{ gated: closed }" :style="{ '--c': `var(--note-${colour})` }">
      <span class="sr-only">{{ t('private.newIn', { title: column.title }) }}</span>
      <textarea
        v-model="text" :maxlength="board.noteLimit" rows="2" :disabled="board.locked || closed" :data-testid="`draft-${column.id}`"
        :aria-describedby="gate.closedBy ? `gated-${column.id}` : undefined"
        :placeholder="board.locked ? t('private.locked') : closed ? t('gated.write.placeholder') : coarse ? t('private.placeholderTouch') : t('private.placeholder')"
        @keydown="onKey"
      />
      <small class="hint-row"><span>{{ t('private.hint') }}</span><NoteCounter :value="text.length" :max="board.noteLimit" /></small>
    </label>
    <div v-if="colorsOpen" class="swatches" role="group" :aria-label="t('note.color')" :data-testid="`compose-colors-${column.id}`">
      <button
        v-for="i in NOTE_COLOR_COUNT" :key="i" type="button" class="sw" :class="{ on: colour === i - 1 }" :style="{ background: `var(--note-${i - 1})` }"
        :aria-label="t('note.colorN', { n: i })" :aria-pressed="colour === i - 1" :data-testid="`compose-color-${column.id}-${i - 1}`" @click="picked = i - 1"
      />
    </div>
    <div class="compose-actions">
      <span class="sig-group" role="group" :aria-label="t('private.signature')" :data-testid="`signature-${column.id}`" :data-signed="signed">
        <button
          class="sig" type="button" :class="{ on: signed }" :aria-pressed="signed" :aria-label="identity.name.trim() ? t('private.signedAs', { name: identity.name }) : t('private.signedNoName')" :title="signed ? t('private.signedHint') : t('private.anonymousHint')"
          :data-testid="`signature-named-${column.id}`" @click="setSignature(true)"
        ><Icon name="lucide:user-round" /></button>
        <button class="sig" type="button" :class="{ on: !signed }" :aria-pressed="!signed" :aria-label="t('private.anonymous')" :title="t('private.anonymousHint')" :data-testid="`signature-anon-${column.id}`" @click="setSignature(false)"><Icon name="lucide:venetian-mask" /></button>
      </span>
      <button class="mini-btn colour-btn" type="button" :aria-label="t('private.colour')" :aria-expanded="colorsOpen" :data-testid="`compose-colour-toggle-${column.id}`" @click="colorsOpen = !colorsOpen">
        <span class="dot" :style="{ background: `var(--note-${colour})` }" aria-hidden="true" /><Icon name="lucide:palette" />
      </button>
      <Dropdown width="250px" align="start">
        <template #trigger="{ toggle, open }">
          <button class="mini-btn" type="button" :aria-label="t('private.help')" :aria-expanded="open" :data-testid="`compose-help-${column.id}`" @click="toggle"><Icon name="lucide:circle-help" /></button>
        </template>
        <p class="help-text">{{ t('private.keys') }}</p>
      </Dropdown>
      <button class="btn btn-sm" type="button" :disabled="board.locked || closed || !text.trim()" :data-testid="`compose-publish-${column.id}`" @click="publishNow"><Icon name="lucide:send" /> {{ t('private.publishNow') }}</button>
      <button class="btn btn-sm btn-primary" type="button" :disabled="board.locked || closed || !text.trim()" :data-testid="`compose-add-${column.id}`" @click="add"><Icon name="lucide:plus" /> {{ t('private.add') }}</button>
    </div>
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
.similar { margin: 0; display: flex; flex-wrap: wrap; gap: .3rem; align-items: center; font-size: .85rem; color: var(--muted); }
.similar .link { overflow-wrap: anywhere; text-align: left; border: 0; background: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font: inherit; font-weight: 600; }
.drafts { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; max-height: 22vh; overflow: auto; }
.draft { display: flex; justify-content: space-between; gap: .5rem; padding: .5rem .6rem; border: 1.5px dashed var(--c); border-radius: 8px; animation: pop-in .25s var(--ease); }
/* Pointer devices reveal the actions on hover or focus; touch screens always show them. */
@media (hover: hover) {
  .draft .acts { opacity: 0; transition: opacity .15s; }
  .draft:hover .acts, .draft:focus-within .acts { opacity: 1; }
}
.draft p { overflow-wrap: anywhere; white-space: pre-wrap; font-size: .92rem; }
.acts { display: flex; flex: none; color: var(--muted); }
.composer { display: grid; gap: .3rem; padding: .6rem; border-radius: 6px; background: var(--c); color: var(--note-ink); box-shadow: var(--shadow-1); transform: rotate(-.6deg); }
.priv[data-area="small"] .composer textarea { min-height: 2rem; }
.priv[data-area="large"] .composer textarea { min-height: 9rem; }
.composer textarea { width: 100%; min-height: 3.2rem; resize: none; padding: 0; border: 0; background: transparent; color: inherit; outline: none; font-weight: 500; }
.composer textarea::placeholder { color: color-mix(in oklab, var(--note-ink) 62%, transparent); }
.composer small { font-size: .7rem; font-weight: 500; color: color-mix(in oklab, var(--note-ink) 80%, transparent); }
.hint-row { display: flex; justify-content: space-between; gap: .5rem; align-items: center; }
.compose-actions { display: flex; gap: .4rem; justify-content: flex-end; align-items: center; flex-wrap: wrap; }
.sig-group { display: inline-flex; border: 1px solid var(--control, var(--border)); border-radius: 999px; overflow: hidden; }
.sig { display: inline-grid; place-items: center; width: 30px; min-height: 28px; padding: 0; border: 0; background: transparent; color: var(--text); cursor: pointer; }
.sig:hover { background: color-mix(in oklab, var(--accent) 12%, transparent); }
.sig.on { background: var(--accent); color: var(--accent-ink, #fff); }
.colour-btn { position: relative; }
.colour-btn .dot { position: absolute; right: 3px; bottom: 3px; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 1px var(--border); }
.help-text { margin: 0; padding: .5rem .65rem; font-size: .85rem; color: var(--text); }
.compose-actions > .sig-group { margin-right: 0; }
.swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(24px, 1fr)); gap: 5px; padding: 0 .2rem; }
.sw { aspect-ratio: 1; min-width: 24px; min-height: 24px; border-radius: 50%; border: 2px solid transparent; box-shadow: 0 0 0 1px var(--border); cursor: pointer; }
.sw.on { border-color: var(--text); }
.composer.gated { background: var(--gated-bg); color: var(--muted); box-shadow: none; transform: none; border: 1.5px dashed var(--gated-line); }
.composer.gated textarea::placeholder { color: var(--muted); }
.composer:focus-within { box-shadow: 0 0 0 3px var(--accent), var(--shadow-1); }
</style>
