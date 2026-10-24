<script setup lang="ts">
const { t } = useT()
const props = defineProps<{ open: boolean; wrong: boolean }>()
const emit = defineEmits<{ submit: [passcode: string] }>()
const value = ref('')
watch(() => props.open, (v) => { if (v) value.value = '' })
function submit() { if (value.value) emit('submit', value.value) }
</script>

<template>
  <BaseDialog :open="open" :title="t('passcode.title')" width="440px" :closable="false">
    <form id="passcode-form" class="form" @submit.prevent="submit">
      <p class="muted">{{ t('passcode.intro') }}</p>
      <input
        v-model="value" class="field" type="password" autocomplete="off" autofocus required
        :aria-label="t('passcode.label')" :aria-invalid="wrong" aria-describedby="passcode-error" data-testid="passcode-input"
      />
      <p v-if="wrong" id="passcode-error" class="error" role="alert" data-testid="passcode-wrong">{{ t('passcode.wrong') }}</p>
    </form>
    <template #footer>
      <NuxtLink to="/" class="btn btn-ghost">{{ t('passcode.leave') }}</NuxtLink>
      <button class="btn btn-primary" type="submit" form="passcode-form" data-testid="passcode-submit">{{ t('passcode.submit') }} <Icon name="lucide:lock-open" /></button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.form { display: grid; gap: .75rem; }
.error { margin: 0; color: var(--danger, #b42318); font-weight: 600; }
</style>
