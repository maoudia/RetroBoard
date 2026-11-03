<script setup lang="ts">
import type { SettingsPatch } from '@retroboard/application'
import { DISPLAY_SCALES, LIMITS, NOTE_TEXT_MIN } from '@retroboard/domain'
const { t } = useT()

const ui = useUiStore()
const board = useBoardStore()
const open = computed({ get: () => ui.dialog === 'options', set: (v) => { if (!v && ui.dialog === 'options') ui.close() } })
const SCALE_ICON = { small: 'minimize-2', normal: 'square', large: 'maximize-2' } as const
const s = computed(() => board.settings!)
/** Simple keeps title, votes, privacy, theme and format; advanced shows every setting (change simple-advanced-mode). */
const advanced = computed(() => useSettingsStore().s.uiMode === 'advanced')
const title = ref('')
const resetAsk = ref(false)
const resetVotesAsk = ref(false)
const resetClockAsk = ref(false)
watch(open, (v) => { if (v) title.value = board.settings?.title ?? '' })

/** Everyone may put the whole budget on one idea. Keeps following the budget while it is on. */
const allOnOne = computed(() => s.value.voteLimit > 1 && s.value.maxVotesPerItem >= s.value.voteLimit)
function setLimit(n: number) { set(allOnOne.value ? { voteLimit: n, maxVotesPerItem: n } : { voteLimit: n }) }
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

      <!-- Display for the whole room: the facilitator sets it, everyone sees the same board (change board-layout-v2). -->
      <section class="grp" data-testid="opt-display">
        <h3>{{ t('options.display') }}</h3>
        <div v-for="k in (['noteSize', 'noteText'] as const)" :key="k" class="line">
          <span><strong>{{ t(`options.${k}` as never) }}</strong></span>
          <span class="pick-seg" role="group" :aria-label="t(`options.${k}` as never)">
            <button
              v-for="z in DISPLAY_SCALES" :key="z" type="button" :class="{ on: (s[k] ?? 'normal') === z }" :aria-pressed="(s[k] ?? 'normal') === z" :disabled="!board.access.canSteer"
              :data-testid="`opt-${k}-${z}`" @click="set({ [k]: z })"
            ><Icon :name="`lucide:${SCALE_ICON[z]}`" /> {{ t(`options.scale.${z}` as never) }}</button>
          </span>
        </div>
      </section>
      <section v-if="advanced" class="grp">
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
        <ToggleSwitch plain :label="t('setup.voting.enabled')" :hint="t('setup.voting.enabled.hint')" :model-value="s.votingEnabled !== false" data-testid="opt-voting-enabled" @update:model-value="(on: boolean) => set({ votingEnabled: on })" />
        <div class="line">
          <span><strong>{{ t('options.votesPer') }}</strong><small class="muted">{{ t('options.votesPer.hint') }}</small></span>
          <span class="stepper">
            <button class="mini-btn" type="button" :aria-label="t('options.less')" :disabled="s.voteLimit <= LIMITS.minVotes" @click="setLimit(s.voteLimit - 1)"><Icon name="lucide:minus" /></button>
            <output class="mono" data-testid="opt-votes">{{ s.voteLimit }}</output>
            <button class="mini-btn" type="button" :aria-label="t('options.more')" :disabled="s.voteLimit >= LIMITS.maxVotes" @click="setLimit(s.voteLimit + 1)"><Icon name="lucide:plus" /></button>
          </span>
        </div>
        <!-- All votes on one idea: off by default; it is the per-idea cap set to the whole vote budget (change vote-all-on-one-idea). -->
        <ToggleSwitch v-if="advanced" plain :label="t('options.allOnOne')" :hint="t('options.allOnOne.hint')" :model-value="allOnOne" :disabled="s.voteLimit <= 1" data-testid="opt-all-on-one" @update:model-value="(on: boolean) => set({ maxVotesPerItem: on ? s.voteLimit : 1 })" />
        <div v-if="advanced" class="line">
          <span><strong>{{ t('options.perItem') }}</strong><small class="muted">{{ t('options.perItem.hint') }}</small></span>
          <span class="stepper">
            <button class="mini-btn" type="button" :aria-label="t('options.perItem.less')" :disabled="s.maxVotesPerItem <= 1" @click="set({ maxVotesPerItem: s.maxVotesPerItem - 1 })"><Icon name="lucide:minus" /></button>
            <output class="mono" data-testid="opt-per-item">{{ s.maxVotesPerItem }}</output>
            <button class="mini-btn" type="button" :aria-label="t('options.perItem.more')" :disabled="s.maxVotesPerItem >= s.voteLimit" data-testid="opt-per-item-more" @click="set({ maxVotesPerItem: s.maxVotesPerItem + 1 })"><Icon name="lucide:plus" /></button>
          </span>
        </div>
        <div v-if="advanced" class="line">
          <span><strong>{{ t('options.votable') }}</strong><small class="muted">{{ t('options.votable.hint') }}</small></span>
          <span class="pick-seg" role="group" :aria-label="t('options.votable')">
            <button v-for="v in (['both', 'notes', 'clusters'] as const)" :key="v" type="button" :class="{ on: s.votable === v }" :aria-pressed="s.votable === v" :data-testid="`opt-votable-${v}`" @click="set({ votable: v })">{{ t(`options.votable.${v}`) }}</button>
          </span>
        </div>
        <div v-if="advanced && board.columns.length" class="line cols" data-testid="opt-votable-columns">
          <span><strong>{{ t('options.votableColumns') }}</strong><small class="muted">{{ t('options.votableColumns.hint') }}</small></span>
          <ul class="collist">
            <li v-for="c in board.columns" :key="c.id">
              <ToggleSwitch plain :label="c.title" :model-value="c.votable !== false" :data-testid="`opt-votable-col-${c.id}`" @update:model-value="(on: boolean) => board.commands.updateColumn(c.id, { votable: on })" />
            </li>
          </ul>
        </div>
        <ToggleSwitch plain :label="t('options.secret')" :hint="t('options.secret.hint')" :model-value="s.secretVoting" data-testid="opt-secret" @update:model-value="(on: boolean) => set({ secretVoting: on })" />
        <ToggleSwitch v-if="advanced" plain :label="t('options.arrivals')" :hint="t('options.arrivals.hint')" :model-value="s.announceArrivals !== false" data-testid="opt-arrivals" @update:model-value="(on: boolean) => set({ announceArrivals: on })" />
        <ToggleSwitch plain :label="t('options.lock')" :hint="t('options.lock.hint')" :model-value="s.locked" data-testid="opt-lock" @update:model-value="(on: boolean) => set({ locked: on })" />
        <ToggleSwitch v-if="advanced" plain :label="t('options.browserAgents')" :hint="t('options.browserAgents.hint')" :model-value="s.browserAgentsAllowed !== false" data-testid="opt-browser-agents" @update:model-value="(on: boolean) => set({ browserAgentsAllowed: on })" />
        <ToggleSwitch v-if="board.access.role !== 'participant'" plain :label="t('roles.open')" :hint="t('roles.open.hint')" :model-value="s.openFacilitation" data-testid="opt-open-facilitation" @update:model-value="(on: boolean) => set({ openFacilitation: on })" />
      </section>

      <section v-if="advanced" class="grp">
        <h3>{{ t('actions.title') }}</h3>
        <div class="line">
          <span><strong>{{ t('actions.mode') }}</strong><small class="muted">{{ t('actions.mode.hint') }}</small></span>
          <span class="pick-seg" role="group" :aria-label="t('actions.mode')">
            <button v-for="m in (['checkbox', 'workflow'] as const)" :key="m" type="button" :class="{ on: s.actionMode === m }" :aria-pressed="s.actionMode === m" :data-testid="`opt-action-${m}`" @click="set({ actionMode: m })">{{ t(`actions.mode.${m}`) }}</button>
          </span>
        </div>
      </section>

      <section v-if="advanced" class="grp">
        <h3>{{ t('talk.title') }}</h3>
        <div class="line">
          <span><strong>{{ t('talk.mode') }}</strong><small class="muted">{{ t('talk.mode.hint') }}</small></span>
          <span class="pick-seg" role="group" :aria-label="t('talk.mode')">
            <button v-for="m in (['off', 'ring', 'popup'] as const)" :key="m" type="button" :class="{ on: s.talkMode === m }" :aria-pressed="s.talkMode === m" :data-testid="`opt-talk-${m}`" @click="set({ talkMode: m })">{{ t(`talk.mode.${m}`) }}</button>
          </span>
        </div>
        <template v-if="s.talkMode !== 'off'">
          <div class="line">
            <span><strong>{{ t('talk.budget') }}</strong></span>
            <span class="pick-seg" role="group" :aria-label="t('talk.budget')">
              <button v-for="m in [1, 2, 3, 5]" :key="m" type="button" :class="{ on: s.talkBudgetMs === m * 60_000 }" :aria-pressed="s.talkBudgetMs === m * 60_000" :data-testid="`opt-talk-budget-${m}`" @click="set({ talkBudgetSec: m * 60 })">{{ m }} min</button>
            </span>
          </div>
          <ToggleSwitch plain :label="t('talk.selfStart')" :hint="t('talk.selfStart.hint')" :model-value="s.talkSelfStart" data-testid="opt-talk-self" @update:model-value="(on: boolean) => set({ talkSelfStart: on })" />
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
          <span><strong>{{ t('options.resetVotes') }}</strong><small class="muted">{{ t('options.resetVotes.hint') }}</small></span>
          <button class="btn btn-danger btn-sm" type="button" data-testid="opt-reset-votes" @click="resetVotesAsk = true"><Icon name="lucide:rotate-ccw" /> {{ t('options.resetBtn') }}</button>
        </div>
        <div class="line">
          <span><strong>{{ t('options.resetClock') }}</strong><small class="muted">{{ t('options.resetClock.hint') }}</small></span>
          <button class="btn btn-danger btn-sm" type="button" data-testid="opt-reset-clock" @click="resetClockAsk = true"><Icon name="lucide:timer-reset" /> {{ t('options.resetBtn') }}</button>
        </div>
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
      <section class="grp modes">
        <ModeSwitch />
        <small v-if="!advanced" class="muted">{{ t('mode.moreOptions') }}</small>
      </section>
    </template>
    <ConfirmDialog v-model:open="resetVotesAsk" danger confirm-icon="lucide:eraser" :title="t('options.resetVotes.title')" :confirm-label="t('options.resetBtn')" :message="t('options.resetVotes.msg')" @confirm="board.commands.resetVotes(); ui.close()" />
    <ConfirmDialog v-model:open="resetClockAsk" danger confirm-icon="lucide:rotate-ccw" :title="t('options.resetClock.title')" :confirm-label="t('options.resetBtn')" :message="t('options.resetClock.msg')" @confirm="board.commands.resetTimer(undefined, true); ui.close()" />
    <ConfirmDialog v-model:open="resetAsk" danger confirm-icon="lucide:eraser" :title="t('options.resetConfirm.title')" :confirm-label="t('options.resetConfirm.ok')" :message="t('options.resetConfirm.msg')" @confirm="board.commands.resetBoard(); ui.close()" />
  </BaseDialog>
</template>

<style scoped>
.steer { display: contents; border: 0; margin: 0; padding: 0; min-width: 0; }
.steer:disabled :is(.line, .lbl) { opacity: .6; }
.readonly { display: flex; gap: .5rem; align-items: center; margin: 0; padding: .6rem .8rem; border-radius: var(--r-control); background: var(--surface2); font-weight: 600; }
.grp { display: grid; gap: .7rem; padding-top: .9rem; border-top: 1px solid var(--border); }
h3 { font-size: var(--fs-md); color: var(--muted); text-transform: uppercase; letter-spacing: .06em; font-family: var(--f-body); font-weight: 800; }
.pick-seg button { display: inline-flex; align-items: center; gap: .3rem; white-space: nowrap; }
.pick-seg button:disabled { opacity: .5; cursor: default; }
.line > .btn, .line > .seg { flex: none; white-space: nowrap; }
.line { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.line span:first-child { display: grid; gap: 2px; min-width: 0; }
/* Narrow screens: a row with a wide control (language, light or dark) puts the control under its label instead of squeezing the text (change ux-irritants-wave-3). */
@media (max-width: 600px) { .line:has(> .seg, > .pick-seg) { flex-direction: column; align-items: stretch; gap: .4rem; } .line:has(> .seg, > .pick-seg) > :not(:first-child) { align-self: flex-start; max-width: 100%; } }
.line small { font-size: var(--fs-sm); }
.stepper { display: inline-flex; align-items: center; gap: .3rem; padding: 3px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface2); }
.stepper output { min-width: 2ch; text-align: center; font-weight: 800; }
.btns { display: flex; gap: .4rem; flex-wrap: wrap; justify-content: flex-end; }
.danger-zone h3 { color: var(--danger); }
.cols { align-items: flex-start; flex-wrap: wrap; }
.collist { list-style: none; margin: 0; padding: 0; display: grid; gap: .3rem; min-width: min(100%, 16rem); }
</style>
