<script setup lang="ts">
import { actionsFromCsv, actionsFromJson } from '@retroboard/application'
import type { ImportedAction } from '@retroboard/domain'
const { t } = useT()

/** Board creation: pick the previous actions to carry over (team profile on this device, a file, or a live board). */
const model = defineModel<ImportedAction[]>({ required: true })
/** Only the previous retros of this team (and project, when set) are offered (change team-workspaces). */
const props = defineProps<{ teamId: string, project: string | null }>()
const team = useTeamStore()
const { push } = useToasts()
const { locale } = useT()
const { loadFromLiveBoard } = useLiveCarryOver()

const fromTeam = computed<ImportedAction[]>(() => team.candidates(props.teamId, props.project).map((c) => ({ text: c.text, owner: c.owner, status: c.status as ImportedAction['status'], ...(c.due ? { due: c.due } : {}), from: c.from })))
const dates = computed(() => team.candidates(props.teamId, props.project).map((c) => new Date(c.at).toLocaleDateString(locale.value)))
const candidates = ref<ImportedAction[]>([...fromTeam.value])
const picked = ref<Set<number>>(new Set(candidates.value.map((_, i) => i)))
const liveUrl = ref('')
const loadingLive = ref(false)
// Another team or project: its own previous actions replace the list, files added by hand are kept out of the swap.
watch(fromTeam, (next) => { candidates.value = [...next]; picked.value = new Set(next.map((_, i) => i)) })
watch([candidates, picked], () => { model.value = candidates.value.filter((_, i) => picked.value.has(i)) }, { immediate: true, deep: true })

function toggle(i: number, on: boolean) {
  const next = new Set(picked.value)
  if (on) next.add(i); else next.delete(i)
  picked.value = next
}
async function fromFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const text = await file.text()
  const found = (file.name.toLowerCase().endsWith('.csv') ? actionsFromCsv(text, { openOnly: true }) : actionsFromJson(text, { openOnly: true }) ?? actionsFromCsv(text, { openOnly: true }))
  if (!found?.length) return push(t('carry.invalid'), 'warn')
  const start = candidates.value.length
  candidates.value = [...candidates.value, ...found]
  picked.value = new Set([...picked.value, ...found.map((_, k) => start + k)])
}
async function fromLiveBoard() {
  if (!liveUrl.value.trim()) return
  loadingLive.value = true
  try {
    const found = await loadFromLiveBoard(liveUrl.value)
    if (!found?.length) return push(t('carry.invalid'), 'warn')
    const start = candidates.value.length
    candidates.value = [...candidates.value, ...found]
    picked.value = new Set([...picked.value, ...found.map((_, k) => start + k)])
    liveUrl.value = ''
  } finally {
    loadingLive.value = false
  }
}
</script>

<template>
  <section class="carry" data-testid="carry-over">
    <h2 class="h"><Icon name="lucide:history" /> {{ t('carry.title') }}</h2>
    <p class="muted">{{ t('carry.intro') }}</p>
    <p v-if="!fromTeam.length" class="src muted" data-testid="carry-none">{{ t('carry.none') }}</p>
    <ul v-if="candidates.length" class="list" data-testid="carry-list">
      <li v-for="(a, i) in candidates" :key="i">
        <label>
          <input type="checkbox" :checked="picked.has(i)" :data-testid="`carry-item-${i}`" @change="toggle(i, ($event.target as HTMLInputElement).checked)" />
          <span class="txt">{{ a.text }}</span>
          <small class="muted">{{ a.owner || t('common.anonymous') }} · {{ t(`actions.status.${a.status}`) }}<template v-if="a.from && dates[i]"> · {{ a.from }}, {{ dates[i] }}</template></small>
        </label>
      </li>
    </ul>
    <div class="sources">
      <label class="file">
        <span class="btn btn-sm"><Icon name="lucide:file-up" /> {{ t('carry.file') }}</span>
        <input type="file" accept=".json,.csv,application/json,text/csv" class="visually-hidden" data-testid="carry-file" @change="fromFile" />
      </label>
      <div class="live-board">
        <label class="live-url">
          <span>{{ t('carry.liveBoard') }}</span>
          <input v-model="liveUrl" type="url" placeholder="https://retroboard.maoudia.com/boards#..." class="field" data-testid="carry-live-url" />
        </label>
        <button class="btn btn-sm" :disabled="!liveUrl.trim() || loadingLive" data-testid="carry-live-fetch" @click="fromLiveBoard">
          <Icon :name="loadingLive ? 'lucide:loader-2' : 'lucide:link'" /> {{ t('carry.fetch') }}
        </button>
      </div>
    </div>
    <small class="muted">{{ t('carry.fileHint') }}</small>
    <p v-if="candidates.length" class="muted" data-testid="carry-count">{{ t('carry.selected', { n: model.length }) }}</p>
  </section>
</template>

<style scoped>
.carry { display: grid; gap: .5rem; }
.h { display: flex; gap: .5rem; align-items: center; margin: 0; font-size: var(--fs-lg); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: .3rem; max-height: 260px; overflow: auto; }
label { display: flex; gap: .55rem; align-items: center; }
.txt { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.sources { display: grid; gap: .6rem; }
.file { cursor: pointer; }
.file:focus-within .btn { outline: 2px solid var(--accent); outline-offset: 2px; }
.live-board { display: flex; gap: .4rem; align-items: flex-end; }
.live-url { flex: 1; display: grid; gap: .25rem; font-weight: 600; }
.live-url .field { padding: .4rem .5rem; font-size: var(--fs-sm); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
