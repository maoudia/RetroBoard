<script setup lang="ts">
import { type ImportedAction, presetPhases } from '@retroboard/domain'
import type { AgendaDraft } from '~/components/AgendaEditor.vue'
import type { SetupResult } from '~/components/BoardSetupForm.vue'
import { suggestThemeForDate } from '@retroboard/domain'
import { markSolo } from '~/utils/solo'
import { boardHash, newKeyRing } from '~/utils/invite'
import type { CloneSpec } from '@retroboard/application'
import { CLONE_KEY } from '~/utils/clone'
const { t } = useT()

const theme = useThemeStore()
useSetupAgentTools()
const settings = useSettingsStore()
const router = useRouter()
const recents = useRecentsStore()
const advanced = computed(() => settings.s.uiMode === 'advanced')
useHead({ title: computed(() => t('new.pageTitle')) })

/** A clone started from a board: its structure (or only its open actions) prefills this form (change feedback-wave-7). */
const route = useRoute()
const cloned = ref<CloneSpec | null>(null)
onMounted(() => {
  try {
    const raw = sessionStorage.getItem(CLONE_KEY)
    if (raw && route.query.clone) cloned.value = JSON.parse(raw) as CloneSpec
    sessionStorage.removeItem(CLONE_KEY)
  } catch { cloned.value = null }
  void theme.use(cloned.value?.themeId ?? settings.s.defaultTheme ?? suggestThemeForDate(new Date()).themeId, false)
  const c = cloned.value
  if (c?.actions?.length) carry.value = c.actions
  if (c?.agenda) { agenda.value = { enabled: true, phases: c.agenda.phases, rules: c.agenda.rules, autoPublish: c.agenda.autoPublish, autoStart: true, chain: c.agenda.chain }; agendaEdited.value = true }
})

/** Previous actions to carry over into the new board (team profile or a file). */
const carry = ref<ImportedAction[]>([])
/** Team and project of the new board (change team-workspaces): advanced shows both, simple keeps the last team. */
const team = useTeamStore()
const NEW_TEAM = '__new'
const teamChoice = ref(team.current?.id ?? NEW_TEAM)
const newTeamName = ref('')
const project = ref('')
const projectName = computed(() => project.value.trim() || null)
/** Default: the one-hour agenda (spec: 8 phases, 60 minutes) unless the facilitator edits it. */
const agenda = ref<AgendaDraft>({ enabled: true, phases: presetPhases(60), rules: true, autoPublish: true, autoStart: true, chain: true })
/** The time available in the format picker picks the closest agenda preset, until the agenda is edited by hand (#224). */
const agendaEdited = ref(false)
function onAgenda(next: AgendaDraft) { agenda.value = next; agendaEdited.value = true }
function onMinutes(minutes: number) {
  if (agendaEdited.value) return
  const preset = ([30, 45, 60, 90] as const).find((n) => n >= minutes) ?? 90
  agenda.value = { ...agenda.value, phases: presetPhases(preset) }
}
const { $ports } = useNuxtApp()
// "Try solo" lands here with solo preselected: same form, same engine, the relay just lives in this tab.
const soloMode = ref(useRoute().query.solo === '1')
function create({ passcode, ...form }: SetupResult) {
  const a = agenda.value
  const setup: SetupResult = {
    ...form,
    ...(carry.value.length ? { importActions: carry.value } : {}),
    ...(cloned.value?.columns?.length ? { columns: cloned.value.columns } : {}),
    ...(a.enabled && a.phases.length ? { agenda: { phases: form.votingEnabled === false ? a.phases.filter((p) => p.kind !== 'vote' && p.kind !== 'rank') : a.phases, rules: a.rules, autoPublish: a.autoPublish, chain: a.chain !== false, ...(a.autoStart ? { autoStart: true } : {}) } } : {}),
  }
  const ring = { ...newKeyRing(), ...(passcode && !soloMode.value ? { passcode: true } : {}) }
  if (soloMode.value) markSolo(ring.roomId)
  const chosen = advanced.value && teamChoice.value === NEW_TEAM && newTeamName.value.trim() ? team.create(newTeamName.value) : team.teams.find((x) => x.id === teamChoice.value) ?? team.ensureTeam()
  team.assign(ring.roomId, chosen.id, advanced.value ? projectName.value : null)
  try {
    sessionStorage.setItem(`retroboard:init:${ring.roomId}`, JSON.stringify(setup))
    // Hand-off to the board page of this tab only; read once and removed there.
    if (passcode && !soloMode.value) { sessionStorage.setItem(`retroboard:pass:${ring.roomId}`, passcode); void $ports.vault.set(ring.roomId, passcode) }
  } catch { /* the board page will ask for the passcode */ }
  void router.push({ path: '/board', hash: boardHash({ kind: 'encrypted', ring }, 'facilitator') })
}
</script>

<template>
  <div class="new">
    <AmbientLayer />
    <header class="top">
      <NuxtLink to="/" class="back"><Icon name="lucide:arrow-left" /> RetroBoard</NuxtLink>
      <ProfileButton />
    </header>
    <main class="wrap">
      <h1 data-testid="new-title">{{ t('new.title') }}</h1>
      <p class="lede">{{ themeText(theme.theme).hero }}</p>
      <div class="modebar">
        <ModeSwitch />
        <p class="muted small" :data-testid="advanced ? 'new-advanced-note' : 'new-simple-note'">{{ t(advanced ? 'new.advanced.note' : 'new.simple.note') }}</p>
      </div>
      <!-- Back from a board lands here: the way back to it must be visible, not a new empty form (#222). -->
      <section v-if="recents.items.length" class="card panel resume" data-testid="new-resume">
        <h2>{{ t('new.resume.title') }}</h2>
        <RecentBoards :limit="3" testid="new-resume-list" />
      </section>
      <section class="card panel">
        <ToggleSwitch v-model="soloMode" plain row-class="solo-line" row-testid="new-solo-line" :label="t('new.soloMode')" :hint="t('new.soloMode.hint')" data-testid="new-solo-switch" />
        <ToggleSwitch plain row-class="solo-line" row-testid="new-presenter-line" :label="t('new.presenterMenus')" :hint="t('new.presenterMenus.hint')" :model-value="settings.s.presenterHideMenus" data-testid="new-presenter-switch" @update:model-value="(on: boolean) => settings.patch({ presenterHideMenus: on })" />
        <p v-if="cloned" class="clone-banner" role="status" data-testid="clone-banner"><Icon name="lucide:copy" /> {{ t(cloned.kind === 'actions' ? 'clone.banner.actions' : 'clone.banner') }}</p>
        <BoardSetupForm :clone-title="cloned?.title" :with-passcode="!soloMode" :theme-id="theme.themeId" :submit-label="t('new.submit')" @update:theme-id="theme.use($event, false)" @update:minutes="onMinutes" @submit="create" />
      </section>
      <section v-if="advanced" class="card panel">
        <AgendaEditor :model-value="agenda" @update:model-value="onAgenda" />
      </section>
      <section v-if="advanced" class="card panel team" data-testid="team-card">
        <h2 class="h2"><Icon name="lucide:users-round" /> {{ t('team.title') }}</h2>
        <p class="muted">{{ t('team.intro') }}</p>
        <div class="team-row">
          <label class="team-f">
            <span>{{ t('team.team') }}</span>
            <select v-model="teamChoice" class="field" data-testid="team-select">
              <option v-for="x in team.teams" :key="x.id" :value="x.id">{{ x.emoji }} {{ x.name }}</option>
              <option :value="NEW_TEAM">{{ t('team.new') }}</option>
            </select>
          </label>
          <label v-if="teamChoice === NEW_TEAM" class="team-f">
            <span>{{ t('team.name') }}</span>
            <input v-model="newTeamName" class="field" maxlength="40" data-testid="team-name" />
          </label>
          <label class="team-f">
            <span>{{ t('team.project') }}</span>
            <input v-model="project" class="field" maxlength="40" list="team-projects" data-testid="team-project" />
            <datalist id="team-projects"><option v-for="p in team.projects(teamChoice)" :key="p" :value="p" /></datalist>
          </label>
        </div>
      </section>
      <section v-if="advanced" class="card panel">
        <CarryOverPicker v-model="carry" :team-id="teamChoice" :project="projectName" />
      </section>
      <p class="foot muted">
        {{ t('new.foot') }}
        <button class="link" type="button" data-testid="solo-new" @click="soloMode = true">{{ t('new.solo') }}</button>
      </p>
      <LegalLinks class="legal" />
    </main>
  </div>
</template>

<style scoped>
.clone-banner { display: flex; gap: .5rem; align-items: flex-start; margin: 0 0 .75rem; padding: .6rem .8rem; border-radius: var(--r-sm); background: var(--accent-soft); font-size: var(--fs-sm); }
.new { position: relative; min-height: 100dvh; }
.top { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; max-width: 1040px; margin: 0 auto; padding: 1rem; }
.back { display: inline-flex; align-items: center; gap: .5rem; color: var(--text); font-weight: 700; text-decoration: none; }
.wrap { position: relative; z-index: 1; display: grid; gap: 1.4rem; width: min(1040px, 100% - 2rem); margin: 0 auto; padding: 1rem 0 3rem; }
h1 { font-size: clamp(2.4rem, 7vw, 4rem); letter-spacing: -.03em; }
.h2 { display: flex; gap: .5rem; align-items: center; margin: 0; font-size: var(--fs-lg); }
.team { display: grid; gap: .6rem; }
.team-row { display: flex; flex-wrap: wrap; gap: .75rem; }
.team-f { display: grid; gap: .25rem; flex: 1 1 14rem; font-weight: 600; }
.solo-line { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
.solo-line span { display: grid; gap: .15rem; }
.lede { max-width: 56ch; font-size: var(--fs-lg); color: var(--muted); }
.panel { padding: clamp(1rem, 3vw, 2rem); }
.resume h2 { margin: 0 0 .5rem; font-size: var(--fs-lg); }
.modebar { display: flex; align-items: flex-start; gap: .8rem 1.2rem; flex-wrap: wrap; }
/* The switch keeps its place in both modes: left aligned, and the note is always there (change hotfix-ux-wave8). */
.modebar :deep(.mode) { margin: 0; justify-self: start; align-self: flex-start; flex: none; }
.modebar .small { margin: 0; font-size: var(--fs-sm); max-width: 62ch; }
.foot { display: grid; gap: .4rem; font-size: var(--fs-sm); }
.link { justify-self: start; border: 0; background: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font-weight: 600; }
</style>
