<script setup lang="ts">
import { type ImportedAction, presetPhases } from '@retroboard/domain'
import type { AgendaDraft } from '~/components/AgendaEditor.vue'
import type { SetupResult } from '~/components/BoardSetupForm.vue'
import { suggestThemeForDate } from '@retroboard/domain'
import { markSolo } from '~/utils/solo'
import { boardHash, newKeyRing } from '~/utils/invite'
const { t } = useT()

const theme = useThemeStore()
useSetupAgentTools()
const settings = useSettingsStore()
const router = useRouter()
const recents = useRecentsStore()
const advanced = computed(() => settings.s.uiMode === 'advanced')
useHead({ title: computed(() => t('new.pageTitle')) })

onMounted(() => { void theme.use(settings.s.defaultTheme ?? suggestThemeForDate(new Date()).themeId, false) })

/** Previous actions to carry over into the new board (team profile or a file). */
const carry = ref<ImportedAction[]>([])
/** Default: the one-hour agenda (spec: 8 phases, 60 minutes) unless the facilitator edits it. */
const agenda = ref<AgendaDraft>({ enabled: true, phases: presetPhases(60), rules: true, autoPublish: true })
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
    ...(a.enabled && a.phases.length ? { agenda: { phases: a.phases, rules: a.rules, autoPublish: a.autoPublish, ...(a.autoStart ? { autoStart: true } : {}) } } : {}),
  }
  const ring = { ...newKeyRing(), ...(passcode && !soloMode.value ? { passcode: true } : {}) }
  if (soloMode.value) markSolo(ring.roomId)
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
        <p v-if="!advanced" class="muted small" data-testid="new-simple-note">{{ t('new.simple.note') }}</p>
      </div>
      <!-- Back from a board lands here: the way back to it must be visible, not a new empty form (#222). -->
      <section v-if="recents.items.length" class="card panel resume" data-testid="new-resume">
        <h2>{{ t('new.resume.title') }}</h2>
        <RecentBoards :limit="3" testid="new-resume-list" />
      </section>
      <section class="card panel">
        <label class="solo-line" data-testid="new-solo-line">
          <span><strong>{{ t('new.soloMode') }}</strong><small class="muted">{{ t('new.soloMode.hint') }}</small></span>
          <input v-model="soloMode" type="checkbox" role="switch" class="switch" data-testid="new-solo-switch" />
        </label>
        <BoardSetupForm :with-passcode="!soloMode" :theme-id="theme.themeId" :submit-label="t('new.submit')" @update:theme-id="theme.use($event, false)" @update:minutes="onMinutes" @submit="create" />
      </section>
      <section v-if="advanced" class="card panel">
        <AgendaEditor :model-value="agenda" @update:model-value="onAgenda" />
      </section>
      <section v-if="advanced" class="card panel">
        <CarryOverPicker v-model="carry" />
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
.new { position: relative; min-height: 100dvh; }
.top { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; max-width: 1040px; margin: 0 auto; padding: 1rem; }
.back { display: inline-flex; align-items: center; gap: .5rem; color: var(--text); font-weight: 700; text-decoration: none; }
.wrap { position: relative; z-index: 1; display: grid; gap: 1.4rem; width: min(1040px, 100% - 2rem); margin: 0 auto; padding: 1rem 0 3rem; }
h1 { font-size: clamp(2.4rem, 7vw, 4rem); letter-spacing: -.03em; }
.solo-line { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
.solo-line span { display: grid; gap: .15rem; }
.lede { max-width: 56ch; font-size: var(--fs-lg); color: var(--muted); }
.panel { padding: clamp(1rem, 3vw, 2rem); }
.resume h2 { margin: 0 0 .5rem; font-size: var(--fs-lg); }
.modebar { display: flex; align-items: center; gap: .8rem 1.2rem; flex-wrap: wrap; }
.modebar .small { margin: 0; font-size: var(--fs-sm); max-width: 62ch; }
.foot { display: grid; gap: .4rem; font-size: var(--fs-sm); }
.link { justify-self: start; border: 0; background: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font-weight: 600; }
</style>
