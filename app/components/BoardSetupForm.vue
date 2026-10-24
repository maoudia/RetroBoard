<script setup lang="ts">
import { LIMITS, DEFAULT_TEMPLATE_ID  } from '@retroboard/domain'

export interface SetupResult { templateId: string; themeId: string; title: string; locale?: 'fr' | 'en' }

const { t, locale } = useT()
const props = defineProps<{ themeId: string; submitLabel: string }>()
const emit = defineEmits<{ 'update:themeId': [id: string]; submit: [result: SetupResult] }>()

const d = new Date()
const title = ref(t('setup.defaultTitle', { date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }))
const templateId = ref<string>(DEFAULT_TEMPLATE_ID)
</script>

<template>
  <form class="setup" data-testid="setup-form" @submit.prevent="emit('submit', { templateId, themeId: props.themeId, title: title.trim() || t('setup.fallbackTitle'), locale })">
    <label class="lbl">{{ t('setup.name') }}
      <input v-model="title" class="field" :maxlength="LIMITS.boardTitle" data-testid="setup-title" />
    </label>

    <section class="block">
      <h3><span class="n">1</span> {{ t('setup.step1') }}</h3>
      <ThemePicker :model-value="themeId" @update:model-value="emit('update:themeId', $event)" />
    </section>

    <section class="block">
      <h3><span class="n">2</span> {{ t('setup.step2') }}</h3>
      <TemplatePicker v-model="templateId" :theme-id="themeId" />
    </section>

    <button class="btn btn-primary go" type="submit" data-testid="setup-submit"><Icon name="lucide:rocket" /> {{ submitLabel }}</button>
  </form>
</template>

<style scoped>
.setup { display: grid; gap: 1.6rem; }
.block { display: grid; gap: .8rem; }
h3 { display: flex; align-items: center; gap: .6rem; font-size: 1.25rem; }
.n { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-family: var(--f-body); font-size: .9rem; font-weight: 800; }
.go { justify-self: start; padding: .8rem 1.5rem; font-size: 1.05rem; }
</style>
