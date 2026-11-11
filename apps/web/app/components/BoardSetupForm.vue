<script setup lang="ts">
import { DEFAULT_VOTE_LIMIT, LIMITS, DEFAULT_TEMPLATE_ID, getTemplate, localizeTemplate, type CloneColumn, type ImportedAction, type PhaseInput } from '@retroboard/domain'
import { nextTitle } from '~/utils/next-title'

export interface SetupResult { votingEnabled?: boolean; voteLimit?: number; secretVoting?: boolean; templateId: string; themeId: string; title: string; locale?: 'fr' | 'en'; passcode?: string; importActions?: ImportedAction[]; columns?: CloneColumn[]; agenda?: { phases: PhaseInput[]; rules: boolean; autoPublish: boolean; autoStart?: boolean; chain?: boolean }; facilitation?: 'everyone' | 'one'; announceArrivals?: boolean; votable?: boolean[] }

const { t, locale } = useT()
/** Simple keeps title and format; theme, facilitation, popups, voting columns and passcode are advanced (change simple-advanced-mode). */
const appSettings = useSettingsStore()
const advanced = computed(() => appSettings.s.uiMode === 'advanced')
/** withPasscode: only on /new (the passcode is fixed at creation, it derives the content key). */
const props = defineProps<{ themeId: string; submitLabel: string; withPasscode?: boolean; /** A cloned board proposes its title (change feedback-wave-7). */ cloneTitle?: string; /** The chosen team's way of starting a board (change team-workspaces): its format and the next title of its series. */ prefill?: { key: string; templateId?: string; title?: string | null } }>()
const emit = defineEmits<{ 'update:themeId': [id: string]; submit: [result: SetupResult]; 'update:minutes': [minutes: number] }>()

const d = new Date()
const title = ref(t('setup.defaultTitle', { date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }))
/** The next number after my last retro's title (change board-creation-v2), unless the person already typed. */
const recents = useRecentsStore()
const dated = title.value
const typed = ref(false)
watch(() => recents.items[0]?.title, (prev) => {
  const next = nextTitle(prev)
  if (next && !typed.value && title.value === dated) title.value = next
}, { immediate: true })
watch(() => props.cloneTitle, (v) => { if (v) { title.value = v; typed.value = true } }, { immediate: true })
const templateId = ref<string>(DEFAULT_TEMPLATE_ID)
watch(() => props.prefill, (p) => {
  if (!p || props.cloneTitle) return
  if (p.templateId && getTemplate(p.templateId)) templateId.value = p.templateId
  if (p.title && !typed.value) title.value = p.title
}, { immediate: true })
/** Votes per person and sealed ballot (advanced): applied right after the board exists. */
const voteLimit = ref<number>(DEFAULT_VOTE_LIMIT)
const secretVoting = ref(false)
/** Voting on or off for the whole board: off removes the voting bar, the vote buttons and the vote phases. */
const votingOn = ref(true)
const passcode = ref('')
/** "Everyone facilitates" is the default; "One facilitator" keeps the roles. */
const facilitation = ref<'everyone' | 'one'>('everyone')
/** Arrival popups are on by default; the activity feed always lists them. */
const announceArrivals = ref(true)
/** Votes per column of the chosen format (change column-voting-scope): the format's defaults, editable here. */
const tpl = computed(() => { const x = getTemplate(templateId.value); return x ? localizeTemplate(x, locale.value) : null })
const votable = ref<boolean[]>([])
watch(tpl, (x) => { votable.value = (x?.columns ?? []).map((c) => c.votable !== false) }, { immediate: true })
const customVotable = computed(() => (tpl.value?.columns ?? []).some((c, i) => (c.votable !== false) !== votable.value[i]))

// A browser agent (WebMCP) may prepare the form; the human still reviews it and clicks Create.
const agent = useAgentStore()
watch(() => agent.setupDraft, (draft) => {
  if (!draft) return
  templateId.value = draft.templateId
  if (draft.title) title.value = draft.title
  if (draft.themeId) emit('update:themeId', draft.themeId)
  agent.setupDraft = null
}, { immediate: true })

/** Creating without a passcode is an informed choice: the risks are stated first. */
const confirmOpen = ref(false)
const result = (): SetupResult => ({ templateId: templateId.value, themeId: props.themeId, title: title.value.trim() || t('setup.fallbackTitle'), locale: locale.value, facilitation: facilitation.value, announceArrivals: announceArrivals.value, ...(advanced.value && voteLimit.value !== DEFAULT_VOTE_LIMIT ? { voteLimit: Math.min(LIMITS.maxVotes, Math.max(LIMITS.minVotes, Math.round(voteLimit.value) || DEFAULT_VOTE_LIMIT)) } : {}), ...(advanced.value && !votingOn.value ? { votingEnabled: false } : {}), ...(advanced.value && votingOn.value && secretVoting.value ? { secretVoting: true } : {}), ...(customVotable.value ? { votable: [...votable.value] } : {}), ...(props.withPasscode && passcode.value ? { passcode: passcode.value } : {}) })
function onSubmit() {
  if (props.withPasscode && !passcode.value.trim()) { confirmOpen.value = true; return }
  emit('submit', result())
}
</script>

<template>
  <form class="setup" data-testid="setup-form" @submit.prevent="onSubmit">
    <label class="lbl">{{ t('setup.name') }}
      <input v-model="title" class="field" :maxlength="LIMITS.boardTitle" data-testid="setup-title" @input="typed = true" />
    </label>

    <PasscodeField v-if="withPasscode" v-model="passcode" :advanced="advanced" />

    <section class="block" data-testid="setup-theme">
      <h3><span class="n">1</span> {{ t('setup.step1') }}</h3>
      <ThemePicker :model-value="themeId" @update:model-value="emit('update:themeId', $event)" />
      <ToggleSwitch plain row-class="tile line" :label="t('setup.ambient')" :hint="t('setup.ambient.hint')" :model-value="appSettings.s.ambient" data-testid="setup-ambient" @update:model-value="(on: boolean) => appSettings.patch({ ambient: on })" />
    </section>

    <section class="block">
      <h3><span class="n">2</span> {{ t('setup.step2') }}</h3>
      <TemplatePicker v-model="templateId" :theme-id="themeId" @update:minutes="emit('update:minutes', $event)" />
    </section>

    <div v-if="advanced" class="adv" data-testid="setup-advanced">
      <fieldset class="tile fac" data-testid="setup-facilitation">
        <legend class="lbl">{{ t('setup.fac.title') }}</legend>
        <label class="opt"><input v-model="facilitation" type="radio" name="facilitation" value="everyone" data-testid="setup-fac-everyone" />
          <span><strong>{{ t('setup.fac.everyone') }}</strong><small class="muted">{{ t('setup.fac.everyone.hint') }}</small></span></label>
        <label class="opt"><input v-model="facilitation" type="radio" name="facilitation" value="one" data-testid="setup-fac-one" />
          <span><strong>{{ t('setup.fac.single') }}</strong><small class="muted">{{ t('setup.fac.single.hint') }}</small></span></label>
      </fieldset>

      <fieldset class="tile votes" data-testid="setup-voting">
        <legend class="lbl">{{ t('setup.voting') }}</legend>
        <ToggleSwitch v-model="votingOn" plain :label="t('setup.voting.enabled')" :hint="t('setup.voting.enabled.hint')" data-testid="setup-voting-enabled" />
        <template v-if="votingOn">
        <label class="opt votes-per">
          <input v-model.number="voteLimit" class="field num" type="number" :min="LIMITS.minVotes" :max="LIMITS.maxVotes" inputmode="numeric" data-testid="setup-vote-limit" />
          <span><strong>{{ t('options.votesPer') }}</strong><small class="muted">{{ t('options.votesPer.hint') }}</small></span>
        </label>
        <ToggleSwitch v-model="secretVoting" plain :label="t('options.secret')" :hint="t('options.secret.hint')" data-testid="setup-secret" />
        </template>
      </fieldset>

      <details v-if="tpl" class="tile votable" data-testid="setup-votable" open>
        <summary class="lbl">{{ t('setup.votable') }}</summary>
        <p class="muted small">{{ t('setup.votable.hint') }}</p>
        <ToggleSwitch v-for="(c, i) in tpl.columns" :key="`${templateId}-${i}`" v-model="votable[i]" plain :label="c.title" :data-testid="`setup-votable-${i}`" />
      </details>

      <ToggleSwitch v-model="announceArrivals" plain row-class="tile line" row-testid="setup-arrivals-row" :label="t('setup.arrivals')" :hint="t('setup.arrivals.hint')" data-testid="setup-arrivals" />
    </div>

    <ConfirmDialog v-model:open="confirmOpen" danger confirm-icon="lucide:unlock" :title="t('setup.passcode.noneTitle')" :message="t('setup.passcode.noneMsg')" :confirm-label="t('setup.passcode.noneOk')" @confirm="emit('submit', result())" />
    <button class="btn btn-primary go" type="submit" data-testid="setup-submit"><Icon name="lucide:rocket" /> {{ submitLabel }}</button>
  </form>
</template>

<style scoped>
.setup { display: flex; flex-direction: column; gap: 1.6rem; } /* a flex column, not a grid: the primary button can stick to the bottom on phones (a grid item sticks only inside its own row) */
.block { display: grid; gap: .8rem; }
h3 { display: flex; align-items: center; gap: .6rem; font-size: var(--fs-xl); }
.n { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-family: var(--f-body); font-size: var(--fs-sm); font-weight: 800; }
.go { align-self: flex-end; padding: .8rem 1.5rem; font-size: var(--fs-md); }
/* Phones: the primary action is a large centred button in the thumb zone, full width and stuck to the bottom while the form scrolls (change responsive-and-i18n-hardening). */
@media (max-width: 480px) {
  .go { position: sticky; bottom: calc(var(--sp-3) + env(safe-area-inset-bottom)); z-index: 5; align-self: stretch; justify-content: center; min-height: 3rem; font-size: var(--fs-lg); box-shadow: var(--shadow-2); }
}
.pass { display: grid; gap: .35rem; }
.adv { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: 1rem; align-items: start; }
/* Each group is a bounded tile, not a full-width strip (change ui-coherence-pass). */
.tile { display: grid; gap: .7rem; min-width: 0; margin: 0; padding: .9rem 1rem; border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); }
.tile > legend, .tile > summary { padding: 0 .3rem; }
.line { display: flex; align-items: center; justify-content: space-between; gap: 1rem; cursor: pointer; }
.line > span { display: grid; gap: .15rem; }
.votable summary { cursor: pointer; }
.small { font-size: var(--fs-sm); margin: 0; }
.num { width: 5rem; flex: none; }
.opt { display: flex; gap: .6rem; align-items: flex-start; cursor: pointer; }
.opt span { display: grid; gap: .1rem; }
.opt input { margin-top: .3rem; }
</style>
