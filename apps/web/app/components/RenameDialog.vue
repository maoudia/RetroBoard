<script setup lang="ts">
import { LIMITS } from '@retroboard/domain'
const { t } = useT()

const props = defineProps<{ open: boolean; name: string | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; save: [name: string] }>()
const value = ref('')
watch(() => props.open, (v) => { if (v) value.value = props.name ?? '' })
const who = computed(() => props.name ?? t('common.anonymous'))
</script>

<template>
  <BaseDialog :open="open" :title="t('roles.rename.title', { name: who })" width="440px" @update:open="emit('update:open', $event)">
    <form id="rename-form" class="form" @submit.prevent="emit('save', value.trim()); emit('update:open', false)">
      <p class="muted">{{ t('roles.rename.intro') }}</p>
      <input v-model="value" class="field" :maxlength="LIMITS.displayName" :placeholder="t('roles.rename.placeholder')" autocomplete="off" autofocus data-testid="rename-input" :aria-label="t('roles.rename.label')" />
    </form>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="emit('update:open', false)">{{ t('common.cancel') }}</button>
      <button class="btn btn-primary" type="submit" form="rename-form" data-testid="rename-save">{{ t('roles.rename.save') }}</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.form { display: grid; gap: .9rem; }
</style>
