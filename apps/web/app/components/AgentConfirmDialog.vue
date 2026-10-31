<script setup lang="ts">
const { t } = useT()
const agent = useAgentStore()
const open = computed({ get: () => agent.pending !== null, set: (v) => { if (!v) agent.answer(false) } })
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('agent.confirm.title')" width="480px">
    <template v-if="agent.pending">
      <p class="lead"><Icon name="lucide:bot" /> {{ agent.pending.title }}</p>
      <ul class="items" data-testid="agent-confirm-items">
        <li v-for="(item, i) in agent.pending.items" :key="i">{{ item }}</li>
      </ul>
      <p class="muted small">{{ t('agent.confirm.hint') }}</p>
    </template>
    <template #footer>
      <button class="btn btn-ghost" type="button" data-testid="agent-decline" @click="agent.answer(false)">{{ t('agent.confirm.decline') }}</button>
      <button class="btn btn-primary" type="button" data-testid="agent-approve" @click="agent.answer(true)">{{ t('agent.confirm.approve') }}</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.lead { display: flex; align-items: center; gap: .5rem; font-weight: 600; }
.items { margin: .75rem 0; padding: .75rem 1rem; border-radius: var(--r-control, 8px); background: var(--surface2); list-style: none; display: grid; gap: .4rem; }
.items li { overflow-wrap: anywhere; }
.small { font-size: var(--fs-sm); }
</style>
