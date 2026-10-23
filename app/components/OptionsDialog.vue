<script setup lang="ts">
import { LIMITS } from '~~/shared/domain/limits'
const { t } = useT()

const ui = useUiStore()
const board = useBoardStore()
const open = computed({ get: () => ui.dialog === 'options', set: (v) => { if (!v && ui.dialog === 'options') ui.close() } })
const s = computed(() => board.settings!)
const title = ref('')
const resetAsk = ref(false)
watch(open, (v) => { if (v) title.value = board.settings?.title ?? '' })

const set = (patch: Record<string, unknown>) => board.send({ t: 'settings.update', ...patch } as never)
const saveTitle = () => { if (title.value.trim() && title.value.trim() !== s.value.title) set({ title: title.value }) }
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('options.title')" width="640px">
    <template v-if="board.settings">
      <label class="lbl">{{ t('options.name') }}
        <input v-model="title" class="field" :maxlength="LIMITS.boardTitle" data-testid="opt-title" @blur="saveTitle" @keydown.enter.prevent="saveTitle" />
      </label>

      <section class="grp">
        <h3>{{ t('options.votes') }}</h3>
        <div class="line">
          <span><strong>{{ t('options.votesPer') }}</strong><small class="muted">{{ t('options.votesPer.hint') }}</small></span>
          <span class="stepper">
            <button class="mini-btn" type="button" :aria-label="t('options.less')" :disabled="s.voteLimit <= LIMITS.minVotes" @click="set({ voteLimit: s.voteLimit - 1 })"><Icon name="lucide:minus" /></button>
            <output class="mono" data-testid="opt-votes">{{ s.voteLimit }}</output>
            <button class="mini-btn" type="button" :aria-label="t('options.more')" :disabled="s.voteLimit >= LIMITS.maxVotes" @click="set({ voteLimit: s.voteLimit + 1 })"><Icon name="lucide:plus" /></button>
          </span>
        </div>
        <label class="line">
          <span><strong>{{ t('options.secret') }}</strong><small class="muted">{{ t('options.secret.hint') }}</small></span>
          <input type="checkbox" role="switch" class="switch" :checked="s.secretVoting" data-testid="opt-secret" @change="set({ secretVoting: ($event.target as HTMLInputElement).checked })" />
        </label>
        <label class="line">
          <span><strong>{{ t('options.lock') }}</strong><small class="muted">{{ t('options.lock.hint') }}</small></span>
          <input type="checkbox" role="switch" class="switch" :checked="s.locked" data-testid="opt-lock" @change="set({ locked: ($event.target as HTMLInputElement).checked })" />
        </label>
      </section>

      <section class="grp">
        <h3>{{ t('options.theme') }}</h3>
        <ThemePicker :model-value="s.themeId" @update:model-value="set({ themeId: $event })" />
      </section>

      <section class="grp">
        <h3>{{ t('options.format') }}</h3>
        <div class="line">
          <span><strong>{{ t('options.columns') }}</strong><small class="muted">{{ t('options.columns.hint') }}</small></span>
          <span class="btns">
            <button class="btn btn-sm" type="button" data-testid="opt-add-column" @click="ui.editColumn(null)"><Icon name="lucide:plus" /> {{ t('options.column') }}</button>
            <button class="btn btn-sm" type="button" data-testid="opt-template" @click="ui.open('template')"><Icon name="lucide:wand-sparkles" /> {{ t('options.changeFormat') }}</button>
          </span>
        </div>
      </section>

      <section class="grp danger-zone">
        <h3>{{ t('options.danger') }}</h3>
        <div class="line">
          <span><strong>{{ t('options.reset') }}</strong><small class="muted">{{ t('options.reset.hint') }}</small></span>
          <button class="btn btn-danger btn-sm" type="button" data-testid="opt-reset" @click="resetAsk = true"><Icon name="lucide:trash" /> {{ t('options.resetBtn') }}</button>
        </div>
      </section>
    </template>
    <ConfirmDialog v-model:open="resetAsk" danger :title="t('options.resetConfirm.title')" :confirm-label="t('options.resetConfirm.ok')" :message="t('options.resetConfirm.msg')" @confirm="board.send({ t: 'board.reset' }); ui.close()" />
  </BaseDialog>
</template>

<style scoped>
.grp { display: grid; gap: .7rem; padding-top: .9rem; border-top: 1px solid var(--border); }
h3 { font-size: 1.05rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; font-family: var(--f-body); font-weight: 800; }
.line { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.line span:first-child { display: grid; gap: 2px; min-width: 0; }
.line small { font-size: .82rem; }
.stepper { display: inline-flex; align-items: center; gap: .3rem; padding: 3px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface2); }
.stepper output { min-width: 2ch; text-align: center; font-weight: 800; }
.btns { display: flex; gap: .4rem; flex-wrap: wrap; justify-content: flex-end; }
.switch { appearance: none; flex: none; width: 46px; height: 26px; border-radius: 999px; background: var(--border); position: relative; cursor: pointer; transition: background .2s; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--text); transition: transform .25s var(--ease); }
.switch:checked { background: var(--accent); }
.switch:checked::after { transform: translateX(20px); background: var(--accent-ink); }
.danger-zone h3 { color: var(--danger); }
</style>
