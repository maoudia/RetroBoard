<script setup lang="ts">
import { type ImportedAction, presetPhases } from '@retroboard/domain'
import type { AgendaDraft } from '~/components/AgendaEditor.vue'
import type { SetupResult } from '~/components/BoardSetupForm.vue'
import { suggestThemeForDate } from '@retroboard/domain'
import { LOCAL_ROOM_PREFIX } from '~/transport'
import { boardHash, newKeyRing } from '~/utils/invite'
import { randomId } from '~/utils/storage'
const { t, locale } = useT()

const theme = useThemeStore()
useSetupAgentTools()
const settings = useSettingsStore()
const router = useRouter()
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
function create({ passcode, ...form }: SetupResult) {
  const a = agenda.value
  const setup: SetupResult = {
    ...form,
    ...(carry.value.length ? { importActions: carry.value } : {}),
    ...(a.enabled && a.phases.length ? { agenda: { phases: a.phases, rules: a.rules, autoPublish: a.autoPublish, ...(a.autoStart ? { autoStart: true } : {}) } } : {}),
  }
  const ring = { ...newKeyRing(), ...(passcode ? { passcode: true } : {}) }
  try {
    sessionStorage.setItem(`retroboard:init:${ring.roomId}`, JSON.stringify(setup))
    // Hand-off to the board page of this tab only; read once and removed there.
    if (passcode) sessionStorage.setItem(`retroboard:pass:${ring.roomId}`, passcode)
  } catch { /* the board page will ask for the passcode */ }
  void router.push({ path: '/board', hash: boardHash({ kind: 'encrypted', ring }, 'facilitator') })
}
function solo() {
  const id = LOCAL_ROOM_PREFIX + randomId(9)
  try { sessionStorage.setItem(`retroboard:init:${id}`, JSON.stringify({ templateId: 'start-stop-continue', themeId: theme.themeId, title: t('landing.solo.title'), locale: locale.value })) } catch { /* ignore */ }
  void router.push({ path: '/board', hash: `#${id}` })
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
      <section class="card panel">
        <BoardSetupForm :with-passcode="true" :theme-id="theme.themeId" :submit-label="t('new.submit')" @update:theme-id="theme.use($event, false)" @update:minutes="onMinutes" @submit="create" />
      </section>
      <section class="card panel">
        <AgendaEditor :model-value="agenda" @update:model-value="onAgenda" />
      </section>
      <section class="card panel">
        <CarryOverPicker v-model="carry" />
      </section>
      <p class="foot muted">
        {{ t('new.foot') }}
        <button class="link" type="button" data-testid="solo-new" @click="solo">{{ t('new.solo') }}</button>
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
.lede { max-width: 56ch; font-size: var(--fs-lg); color: var(--muted); }
.panel { padding: clamp(1rem, 3vw, 2rem); }
.foot { display: grid; gap: .4rem; font-size: var(--fs-sm); }
.link { justify-self: start; border: 0; background: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font-weight: 600; }
</style>
