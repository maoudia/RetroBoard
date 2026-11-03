<script setup lang="ts">
const { toasts, dismiss, pause, resume } = useToasts()
const { t } = useT()
const ICONS = { ok: 'lucide:circle-check', warn: 'lucide:triangle-alert', info: 'lucide:info' } as const
</script>

<template>
  <!-- Floating cards docked under the header: the writing areas live at the bottom of the columns, so nothing
       covers them and the layout never moves (change toast-notifications-v2). -->
  <div class="toasts" data-testid="toasts">
    <TransitionGroup name="toast">
      <div
        v-for="x in toasts" :key="x.id" class="toast" :data-tone="x.tone" :role="x.tone === 'warn' ? 'alert' : 'status'"
        :style="{ '--ms': `${x.ms}ms` }" @pointerenter="pause(x.id)" @pointerleave="resume(x.id)" @focusin="pause(x.id)" @focusout="resume(x.id)"
      >
        <Icon :name="ICONS[x.tone]" class="ico" />
        <span class="txt">{{ x.text }}</span>
        <button v-if="x.action" class="act" type="button" :data-testid="x.action.testid" @click="x.action.run(); dismiss(x.id)">{{ x.action.label }}</button>
        <button class="x" type="button" :aria-label="t('toast.close')" :title="t('toast.close')" @click="dismiss(x.id)"><Icon name="lucide:x" /></button>
        <span class="bar" aria-hidden="true" />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed; z-index: 80; left: 50%; translate: -50% 0; width: min(440px, calc(100vw - 2rem)); display: grid; gap: var(--sp-2, .5rem);
  top: calc(var(--toolbar-actual, var(--toolbar-h, 64px)) + env(safe-area-inset-top, 0px) + .5rem); pointer-events: none;
}
.toast {
  --tone: var(--accent); pointer-events: auto; position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: .6rem;
  padding: .7rem .5rem .8rem .85rem; border-radius: var(--r-card, 14px); font-size: var(--fs-sm); font-weight: 600; line-height: 1.35;
  color: var(--text, inherit); background: color-mix(in oklab, var(--surface2) 94%, transparent); border: 1px solid color-mix(in oklab, var(--tone) 40%, var(--border));
  box-shadow: var(--shadow-2); backdrop-filter: blur(10px);
}
.toast[data-tone="ok"] { --tone: var(--success); }
.toast[data-tone="warn"] { --tone: var(--danger); }
.ico { color: var(--tone); font-size: var(--fs-xl); }
.txt { min-width: 0; overflow-wrap: anywhere; }
.act, .x { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; font: inherit; cursor: pointer; }
.act { padding: 0 .9rem; border-radius: 999px; border: 1px solid var(--tone); background: transparent; color: var(--tone); font-weight: 700; }
.act:hover { background: color-mix(in oklab, var(--tone) 14%, transparent); }
.x { min-width: 44px; border: 0; background: transparent; color: var(--muted); border-radius: 999px; }
.x:hover { color: var(--text, inherit); background: var(--accent-soft); }
.bar { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: var(--tone); transform-origin: left; animation: toast-life var(--ms) linear forwards; }
.toast:hover .bar, .toast:focus-within .bar { animation-play-state: paused; }
@keyframes toast-life { to { transform: scaleX(0); } }
.toast-enter-active { animation: toast-in .28s var(--ease); }
.toast-leave-active { transition: opacity .2s, transform .2s; position: absolute; width: 100%; }
.toast-leave-to { opacity: 0; transform: translateY(-8px); }
@keyframes toast-in { from { opacity: 0; transform: translateY(-12px) scale(.97); } }
@media (prefers-reduced-motion: reduce) { .toast-enter-active, .toast-leave-active { animation: none; transition: none; } .bar { animation: none; display: none; } }
</style>
