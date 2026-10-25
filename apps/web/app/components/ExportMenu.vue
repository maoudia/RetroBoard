<script setup lang="ts">
const { t } = useT()
const ui = useUiStore()
</script>

<template>
  <button class="icon-btn" type="button" data-testid="btn-export" @click="ui.open('export')">
    <Icon name="lucide:download" class="ico" /><span>{{ t('toolbar.export') }}</span>
  </button>
</template>
