<script setup lang="ts">
import { LIMITS, DEFAULT_TEMPLATE_ID, type ImportedAction, type PhaseInput } from '@retroboard/domain'

export interface SetupResult { templateId: string; themeId: string; title: string; locale?: 'fr' | 'en'; passcode?: string; importActions?: ImportedAction[]; agenda?: { phases: PhaseInput[]; rules: boolean; autoPublish: boolean; autoStart?: boolean }; facilitation?: 'everyone' | 'one' }

const { t, locale } = useT()
/** withPasscode: only on /new (the passcode is fixed at creation, it derives the content key). */
const props = defineProps<{ themeId: string; submitLabel: string; withPasscode?: boolean }>()
const emit = defineEmits<{ 'update:themeId': [id: string]; submit: [result: SetupResult]; 'update:minutes': [minutes: number] }>()

const d = new Date()
const title = ref(t('setup.defaultTitle', { date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }))
const templateId = ref<string>(DEFAULT_TEMPLATE_ID)
const passcode = ref('')
/** "Everyone facilitates" is the default; "One facilitator" keeps the roles. */
const facilitation = ref<'everyone' | 'one'>('everyone')

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
  <form class="setup" data-testid="setup-form" @submit.prevent="emit('submit', { templateId, themeId: props.themeId, title: title.trim() || t('setup.fallbackTitle'), locale, facilitation, ...(withPasscode && passcode ? { passcode } : {}) })">
    <label class="lbl">{{ t('setup.name') }}
      <input v-model="title" class="field" :maxlength="LIMITS.boardTitle" data-testid="setup-title" />
    </label>

    <section class="block">
      <h3><span class="n">1</span> {{ t('setup.step1') }}</h3>
      <ThemePicker :model-value="themeId" @update:model-value="emit('update:themeId', $event)" />
    </section>

    <section class="block">
      <h3><span class="n">2</span> {{ t('setup.step2') }}</h3>
      <TemplatePicker v-model="templateId" :theme-id="themeId" @update:minutes="emit('update:minutes', $event)" />
    </section>

    <fieldset class="fac" data-testid="setup-facilitation">
      <legend class="lbl">{{ t('setup.fac.title') }}</legend>
      <label class="opt"><input v-model="facilitation" type="radio" name="facilitation" value="everyone" data-testid="setup-fac-everyone" />
        <span><strong>{{ t('setup.fac.everyone') }}</strong><small class="muted">{{ t('setup.fac.everyone.hint') }}</small></span></label>
      <label class="opt"><input v-model="facilitation" type="radio" name="facilitation" value="one" data-testid="setup-fac-one" />
        <span><strong>{{ t('setup.fac.single') }}</strong><small class="muted">{{ t('setup.fac.single.hint') }}</small></span></label>
    </fieldset>

    <label v-if="withPasscode" class="pass">
      <span class="lbl">{{ t('setup.passcode') }}</span>
      <input v-model="passcode" class="field" type="password" autocomplete="new-password" data-testid="setup-passcode" />
      <small class="muted">{{ t('setup.passcode.hint') }}</small>
    </label>
    <button class="btn btn-primary go" type="submit" data-testid="setup-submit"><Icon name="lucide:rocket" /> {{ submitLabel }}</button>
  </form>
</template>

<style scoped>
.setup { display: grid; gap: 1.6rem; }
.block { display: grid; gap: .8rem; }
h3 { display: flex; align-items: center; gap: .6rem; font-size: 1.25rem; }
.n { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-family: var(--f-body); font-size: .9rem; font-weight: 800; }
.go { justify-self: start; padding: .8rem 1.5rem; font-size: 1.05rem; }
.pass { display: grid; gap: .35rem; }
.fac { display: grid; gap: .5rem; border: 0; padding: 0; margin: 0; }
.opt { display: flex; gap: .6rem; align-items: flex-start; cursor: pointer; }
.opt span { display: grid; gap: .1rem; }
.opt input { margin-top: .3rem; }
</style>
