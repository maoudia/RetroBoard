<script setup lang="ts">
const { toasts, dismiss } = useToasts()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :data-tone="t.tone" role="status">
        <Icon :name="t.tone === 'warn' ? 'lucide:triangle-alert' : 'lucide:circle-check'" />
        <span>{{ t.text }}</span>
        <button v-if="t.action" class="act" type="button" :data-testid="t.action.testid" @click="t.action.run(); dismiss(t.id)">{{ t.action.label }}</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts { position: fixed; z-index: 80; bottom: 18px; left: 50%; translate: -50% 0; display: grid; gap: 8px; justify-items: center; pointer-events: none; }
.toast {
  display: flex; align-items: center; gap: .6rem; padding: .65rem 1rem; border-radius: 999px; font-weight: 600;
  background: var(--surface2); border: 1px solid var(--border); box-shadow: var(--shadow-2);
}
.act { pointer-events: auto; margin-left: .25rem; padding: .2rem .7rem; border-radius: 999px; border: 1px solid currentColor; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.act:hover { background: var(--accent-soft); }
.toast[data-tone="warn"] { color: var(--danger); }
.toast[data-tone="ok"] { color: var(--success); }
.toast-enter-active { animation: pop-in .25s var(--ease); }
.toast-leave-active { transition: opacity .25s, transform .25s; position: absolute; }
.toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
