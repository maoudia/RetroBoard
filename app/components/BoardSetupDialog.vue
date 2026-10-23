<script setup lang="ts">
import type { SetupResult } from './BoardSetupForm.vue'
const { t } = useT()

defineProps<{ open: boolean }>()
const emit = defineEmits<{ submit: [result: SetupResult] }>()
const theme = useThemeStore()
</script>

<template>
  <BaseDialog :open="open" :title="t('setup.title')" width="860px" :closable="false">
    <p class="muted">{{ t('setup.intro') }}</p>
    <BoardSetupForm :theme-id="theme.themeId" :submit-label="t('setup.open')" @update:theme-id="theme.use($event, false)" @submit="emit('submit', $event)" />
  </BaseDialog>
</template>
