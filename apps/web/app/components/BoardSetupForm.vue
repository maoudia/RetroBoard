<script setup lang="ts">
import { LIMITS, DEFAULT_TEMPLATE_ID, getTemplate, localizeTemplate, type ImportedAction, type PhaseInput } from '@retroboard/domain'
import { nextTitle } from '~/utils/next-title'

export interface SetupResult { templateId: string; themeId: string; title: string; locale?: 'fr' | 'en'; passcode?: string; importActions?: ImportedAction[]; agenda?: { phases: PhaseInput[]; rules: boolean; autoPublish: boolean; autoStart?: boolean }; facilitation?: 'everyone' | 'one'; announceArrivals?: boolean; votable?: boolean[] }

const { t, locale } = useT()
/** Simple keeps title and format; theme, facilitation, popups, voting columns and passcode are advanced (change simple-advanced-mode). */
const advanced = computed(() => useSettingsStore().s.uiMode === 'advanced')
/** withPasscode: only on /new (the passcode is fixed at creation, it derives the content key). */
const props = defineProps<{ themeId: string; submitLabel: string; withPasscode?: boolean }>()
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
const templateId = ref<string>(DEFAULT_TEMPLATE_ID)
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
</script>

<template>
  <form class="setup" data-testid="setup-form" @submit.prevent="emit('submit', { templateId, themeId: props.themeId, title: title.trim() || t('setup.fallbackTitle'), locale, facilitation, announceArrivals, ...(customVotable ? { votable: [...votable] } : {}), ...(withPasscode && passcode ? { passcode } : {}) })">
    <label class="lbl">{{ t('setup.name') }}
      <input v-model="title" class="field" :maxlength="LIMITS.boardTitle" data-testid="setup-title" @input="typed = true" />
    </label>

    <section v-if="advanced" class="block">
      <h3><span class="n">1</span> {{ t('setup.step1') }}</h3>
      <ThemePicker :model-value="themeId" @update:model-value="emit('update:themeId', $event)" />
    </section>

    <section class="block">
      <h3><span class="n">{{ advanced ? 2 : 1 }}</span> {{ t('setup.step2') }}</h3>
      <TemplatePicker v-model="templateId" :theme-id="themeId" @update:minutes="emit('update:minutes', $event)" />
    </section>

    <template v-if="advanced">
    <fieldset class="fac" data-testid="setup-facilitation">
      <legend class="lbl">{{ t('setup.fac.title') }}</legend>
      <label class="opt"><input v-model="facilitation" type="radio" name="facilitation" value="everyone" data-testid="setup-fac-everyone" />
        <span><strong>{{ t('setup.fac.everyone') }}</strong><small class="muted">{{ t('setup.fac.everyone.hint') }}</small></span></label>
      <label class="opt"><input v-model="facilitation" type="radio" name="facilitation" value="one" data-testid="setup-fac-one" />
        <span><strong>{{ t('setup.fac.single') }}</strong><small class="muted">{{ t('setup.fac.single.hint') }}</small></span></label>
    </fieldset>

    <details v-if="tpl" class="votable" data-testid="setup-votable">
      <summary class="lbl">{{ t('setup.votable') }}</summary>
      <p class="muted small">{{ t('setup.votable.hint') }}</p>
      <label v-for="(c, i) in tpl.columns" :key="`${templateId}-${i}`" class="opt">
        <input v-model="votable[i]" type="checkbox" :data-testid="`setup-votable-${i}`" />
        <span><strong>{{ c.title }}</strong></span>
      </label>
    </details>

    <label class="opt" data-testid="setup-arrivals-row">
      <input v-model="announceArrivals" type="checkbox" data-testid="setup-arrivals" />
      <span><strong>{{ t('setup.arrivals') }}</strong><small class="muted">{{ t('setup.arrivals.hint') }}</small></span>
    </label>

    <label v-if="withPasscode" class="pass">
      <span class="lbl">{{ t('setup.passcode') }}</span>
      <input v-model="passcode" class="field" type="password" autocomplete="new-password" data-testid="setup-passcode" />
      <small class="muted">{{ t('setup.passcode.hint') }}</small>
    </label>
    </template>

    <button class="btn btn-primary go" type="submit" data-testid="setup-submit"><Icon name="lucide:rocket" /> {{ submitLabel }}</button>
  </form>
</template>

<style scoped>
.setup { display: grid; gap: 1.6rem; }
.block { display: grid; gap: .8rem; }
h3 { display: flex; align-items: center; gap: .6rem; font-size: var(--fs-xl); }
.n { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-family: var(--f-body); font-size: var(--fs-sm); font-weight: 800; }
.go { justify-self: end; padding: .8rem 1.5rem; font-size: var(--fs-md); }
.pass { display: grid; gap: .35rem; }
.fac { display: grid; gap: .5rem; border: 0; padding: 0; margin: 0; }
.votable { display: grid; gap: .5rem; }
.votable summary { cursor: pointer; }
.small { font-size: var(--fs-sm); margin: 0; }
.opt { display: flex; gap: .6rem; align-items: flex-start; cursor: pointer; }
.opt span { display: grid; gap: .1rem; }
.opt input { margin-top: .3rem; }
</style>
