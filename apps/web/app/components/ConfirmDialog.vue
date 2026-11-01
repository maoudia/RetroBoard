<script setup lang="ts">
const { t } = useT()
withDefaults(defineProps<{ open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; confirmIcon?: string }>(), {
  confirmLabel: undefined,
  danger: false,
  confirmIcon: undefined,
})
const emit = defineEmits<{ 'update:open': [value: boolean]; confirm: [] }>()
</script>

<template>
  <BaseDialog :open="open" :title="title" width="440px" @update:open="emit('update:open', $event)">
    <p class="muted">{{ message }}</p>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="emit('update:open', false)"><Icon name="lucide:x" /> {{ t('common.cancel') }}</button>
      <button class="btn" :class="danger ? 'btn-danger' : 'btn-primary'" type="button" data-testid="confirm" @click="emit('confirm'); emit('update:open', false)">
        <Icon :name="confirmIcon ?? (danger ? 'lucide:trash' : 'lucide:check')" /> {{ confirmLabel ?? t('common.confirm') }}
      </button>
    </template>
  </BaseDialog>
</template>
