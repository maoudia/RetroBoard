<script setup lang="ts">
import { SHORTCUTS, type ShortcutGroup } from '@retroboard/application'
const { t } = useT()
const ui = useUiStore()
const board = useBoardStore()
const settings = useSettingsStore()
const open = computed({ get: () => ui.dialog === 'help', set: (v) => { if (!v && ui.dialog === 'help') ui.close() } })
const mac = import.meta.client && /Mac|iPhone|iPad/i.test(navigator.platform)
const mod = mac ? 'Cmd' : 'Ctrl'
const GROUPS: ShortcutGroup[] = ['navigate', 'write', 'board', 'facilitate']
const rows = (g: ShortcutGroup) => SHORTCUTS.filter((s) => s.group === g && (!s.facilitator || board.access.canSteer))
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('kbd.title')" width="560px">
    <p v-if="!settings.s.shortcuts" class="muted" data-testid="kbd-off">{{ t('kbd.off') }}</p>
    <section v-for="g in GROUPS" :key="g" class="grp">
      <h3>{{ t(`kbd.group.${g}`) }}</h3>
      <dl>
        <template v-for="s in rows(g)" :key="s.id">
          <dt><kbd>{{ s.display }}</kbd></dt>
          <dd>{{ t(s.label as never) }}</dd>
        </template>
        <template v-if="g === 'write'">
          <dt><kbd>{{ mod }}+Enter</kbd></dt>
          <dd>{{ t('kbd.publishNow') }}</dd>
        </template>
      </dl>
    </section>
  </BaseDialog>
</template>

<style scoped>
.grp { margin-top: .9rem; }
h3 { margin: 0 0 .4rem; font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
dl { display: grid; grid-template-columns: max-content 1fr; gap: .35rem .9rem; margin: 0; align-items: baseline; }
dt { justify-self: end; }
dd { margin: 0; }
kbd { font-family: var(--f-mono); font-size: .82rem; padding: .1rem .45rem; border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 6px; background: var(--surface2); }
</style>
