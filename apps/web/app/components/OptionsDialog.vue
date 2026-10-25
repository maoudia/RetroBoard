<script setup lang="ts">
import type { SettingsPatch } from '@retroboard/application'
import { LIMITS, NOTE_TEXT_MIN } from '@retroboard/domain'
const { t } = useT()

const ui = useUiStore()
const board = useBoardStore()
const open = computed({ get: () => ui.dialog === 'options', set: (v) => { if (!v && ui.dialog === 'options') ui.close() } })
const s = computed(() => board.settings!)
const title = ref('')
const resetAsk = ref(false)
watch(open, (v) => { if (v) title.value = board.settings?.title ?? '' })

const set = (patch: SettingsPatch) => {
  board.commands.updateSettings(patch)
  // Switching an open board to one facilitator: whoever switches becomes the lead.
  if (patch.openFacilitation === false && board.myKey) { ui.takeoverAsked = true; board.sendRole('role.claim', board.myKey) }
}
const saveTitle = () => { if (title.value.trim() && title.value.trim() !== s.value.title) set({ title: title.value }) }
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('options.title')" width="640px">
    <template v-if="board.settings">
      <p v-if="!board.access.canSteer" class="readonly" role="note" data-testid="opt-readonly"><Icon name="lucide:lock" /> {{ t('roles.readonly') }}</p>
      <!-- Facilitation settings: read-only for participants (native disabled fieldset). -->
      <fieldset class="steer" :disabled="!board.access.canSteer">
      <label class="lbl">{{ t('options.name') }}
        <input v-model="title" class="field" :maxlength="LIMITS.boardTitle" data-testid="opt-title" @blur="saveTitle" @keydown.enter.prevent="saveTitle" />
      </label>

      <section class="grp">
        <h3>{{ t('options.notes') }}</h3>
        <div class="line">
          <span><strong>{{ t('options.noteMax') }}</strong><small class="muted">{{ t('options.noteMax.hint') }}</small></span>
          <span class="stepper">
            <button class="mini-btn" type="button" :aria-label="t('options.noteMax.less')" :disabled="s.noteMaxLength <= NOTE_TEXT_MIN" data-testid="opt-note-max-less" @click="set({ noteMaxLength: Math.max(NOTE_TEXT_MIN, s.noteMaxLength - 20) })"><Icon name="lucide:minus" /></button>
            <output class="mono" data-testid="opt-note-max">{{ s.noteMaxLength }}</output>
            <button class="mini-btn" type="button" :aria-label="t('options.noteMax.more')" :disabled="s.noteMaxLength >= LIMITS.noteText" data-testid="opt-note-max-more" @click="set({ noteMaxLength: Math.min(LIMITS.noteText, s.noteMaxLength + 20) })"><Icon name="lucide:plus" /></button>
          </span>
        </div>
      </section>

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
        <div class="line">
          <span><strong>{{ t('options.perItem') }}</strong><small class="muted">{{ t('options.perItem.hint') }}</small></span>
          <span class="stepper">
            <button class="mini-btn" type="button" :aria-label="t('options.perItem.less')" :disabled="s.maxVotesPerItem <= 1" @click="set({ maxVotesPerItem: s.maxVotesPerItem - 1 })"><Icon name="lucide:minus" /></button>
            <output class="mono" data-testid="opt-per-item">{{ s.maxVotesPerItem }}</output>
            <button class="mini-btn" type="button" :aria-label="t('options.perItem.more')" :disabled="s.maxVotesPerItem >= s.voteLimit" data-testid="opt-per-item-more" @click="set({ maxVotesPerItem: s.maxVotesPerItem + 1 })"><Icon name="lucide:plus" /></button>
          </span>
        </div>
        <div class="line">
          <span><strong>{{ t('options.votable') }}</strong><small class="muted">{{ t('options.votable.hint') }}</small></span>
          <span class="seg" role="group" :aria-label="t('options.votable')">
            <button v-for="v in (['both', 'notes', 'clusters'] as const)" :key="v" type="button" :class="{ on: s.votable === v }" :aria-pressed="s.votable === v" :data-testid="`opt-votable-${v}`" @click="set({ votable: v })">{{ t(`options.votable.${v}`) }}</button>
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
        <label class="line">
          <span><strong>{{ t('options.browserAgents') }}</strong><small class="muted">{{ t('options.browserAgents.hint') }}</small></span>
          <input type="checkbox" role="switch" class="switch" :checked="s.browserAgentsAllowed !== false" data-testid="opt-browser-agents" @change="set({ browserAgentsAllowed: ($event.target as HTMLInputElement).checked })" />
        </label>
        <label v-if="board.access.role !== 'participant'" class="line">
          <span><strong>{{ t('roles.open') }}</strong><small class="muted">{{ t('roles.open.hint') }}</small></span>
          <input type="checkbox" role="switch" class="switch" :checked="s.openFacilitation" data-testid="opt-open-facilitation" @change="set({ openFacilitation: ($event.target as HTMLInputElement).checked })" />
        </label>
      </section>

      <section class="grp">
        <h3>{{ t('actions.title') }}</h3>
        <div class="line">
          <span><strong>{{ t('actions.mode') }}</strong><small class="muted">{{ t('actions.mode.hint') }}</small></span>
          <span class="seg" role="group" :aria-label="t('actions.mode')">
            <button v-for="m in (['checkbox', 'workflow'] as const)" :key="m" type="button" :class="{ on: s.actionMode === m }" :aria-pressed="s.actionMode === m" :data-testid="`opt-action-${m}`" @click="set({ actionMode: m })">{{ t(`actions.mode.${m}`) }}</button>
          </span>
        </div>
      </section>

      <section class="grp">
        <h3>{{ t('talk.title') }}</h3>
        <div class="line">
          <span><strong>{{ t('talk.mode') }}</strong><small class="muted">{{ t('talk.mode.hint') }}</small></span>
          <span class="seg" role="group" :aria-label="t('talk.mode')">
            <button v-for="m in (['off', 'ring', 'popup'] as const)" :key="m" type="button" :class="{ on: s.talkMode === m }" :aria-pressed="s.talkMode === m" :data-testid="`opt-talk-${m}`" @click="set({ talkMode: m })">{{ t(`talk.mode.${m}`) }}</button>
          </span>
        </div>
        <template v-if="s.talkMode !== 'off'">
          <div class="line">
            <span><strong>{{ t('talk.budget') }}</strong></span>
            <span class="seg" role="group" :aria-label="t('talk.budget')">
              <button v-for="m in [1, 2, 3, 5]" :key="m" type="button" :class="{ on: s.talkBudgetMs === m * 60_000 }" :aria-pressed="s.talkBudgetMs === m * 60_000" :data-testid="`opt-talk-budget-${m}`" @click="set({ talkBudgetSec: m * 60 })">{{ m }} min</button>
            </span>
          </div>
          <label class="line">
            <span><strong>{{ t('talk.selfStart') }}</strong><small class="muted">{{ t('talk.selfStart.hint') }}</small></span>
            <input type="checkbox" role="switch" class="switch" :checked="s.talkSelfStart" data-testid="opt-talk-self" @change="set({ talkSelfStart: ($event.target as HTMLInputElement).checked })" />
          </label>
        </template>
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
            <button class="btn btn-sm" type="button" data-testid="opt-template" :disabled="!board.access.canSteer" @click="ui.open('template')"><Icon name="lucide:wand-sparkles" /> {{ t('options.changeFormat') }}</button>
          </span>
        </div>
      </section>

      <section class="grp danger-zone">
        <h3>{{ t('options.danger') }}</h3>
        <div class="line">
          <span><strong>{{ t('options.reset') }}</strong><small class="muted">{{ t('options.reset.hint') }}</small></span>
          <button class="btn btn-danger btn-sm" type="button" data-testid="opt-reset" @click="resetAsk = true"><Icon name="lucide:trash" /> {{ t('options.resetBtn') }}</button>
        </div>
        <div v-if="board.access.role !== 'participant'" class="line">
          <span><strong>{{ t('options.destroy') }}</strong><small class="muted">{{ t('options.destroy.hint') }}</small></span>
          <button class="btn btn-danger btn-sm" type="button" data-testid="opt-destroy" @click="ui.open('destroy')"><Icon name="lucide:flame" /> {{ t('options.destroyBtn') }}</button>
        </div>
      </section>
      </fieldset>
    </template>
    <ConfirmDialog v-model:open="resetAsk" danger :title="t('options.resetConfirm.title')" :confirm-label="t('options.resetConfirm.ok')" :message="t('options.resetConfirm.msg')" @confirm="board.commands.resetBoard(); ui.close()" />
  </BaseDialog>
</template>

<style scoped>
.steer { display: contents; border: 0; margin: 0; padding: 0; min-width: 0; }
.steer:disabled :is(.line, .lbl) { opacity: .6; }
.readonly { display: flex; gap: .5rem; align-items: center; margin: 0; padding: .6rem .8rem; border-radius: 10px; background: var(--surface2); font-weight: 600; }
.seg { display: inline-flex; flex: none; border: 1px solid var(--border); border-radius: var(--r-control); overflow: hidden; }
.seg button { padding: .4rem .75rem; border: 0; border-right: 1px solid var(--border); background: var(--surface2); color: var(--text); cursor: pointer; font-weight: 600; font-size: .85rem; }
.seg button:last-child { border-right: 0; }
.seg button.on { background: var(--accent); color: var(--accent-ink); }
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
