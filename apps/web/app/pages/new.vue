<script setup lang="ts">
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

function create({ passcode, ...setup }: SetupResult) {
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
        <BoardSetupForm :with-passcode="true" :theme-id="theme.themeId" :submit-label="t('new.submit')" @update:theme-id="theme.use($event, false)" @submit="create" />
      </section>
      <p class="foot muted">
        {{ t('new.foot') }}
        <button class="link" type="button" data-testid="solo-new" @click="solo">{{ t('new.solo') }}</button>
      </p>
    </main>
  </div>
</template>

<style scoped>
.new { position: relative; min-height: 100dvh; }
.top { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; max-width: 1040px; margin: 0 auto; padding: 1rem; }
.back { display: inline-flex; align-items: center; gap: .5rem; color: var(--text); font-weight: 700; text-decoration: none; }
.wrap { position: relative; z-index: 1; display: grid; gap: 1.4rem; width: min(1040px, 100% - 2rem); margin: 0 auto; padding: 1rem 0 3rem; }
h1 { font-size: clamp(2.4rem, 7vw, 4rem); letter-spacing: -.03em; }
.lede { max-width: 56ch; font-size: 1.15rem; color: var(--muted); }
.panel { padding: clamp(1rem, 3vw, 2rem); }
.foot { display: grid; gap: .4rem; font-size: .9rem; }
.link { justify-self: start; border: 0; background: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font-weight: 600; }
</style>
