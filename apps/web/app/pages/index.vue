<script setup lang="ts">
import '@fontsource-variable/inter/index.css'
import { THEMES } from '@retroboard/themes'
import { LOCAL_ROOM_PREFIX } from '~/transport'
import { randomId } from '~/utils/storage'
const { t, locale } = useT()

useHead({ title: computed(() => t('landing.title')), meta: [{ name: 'theme-color', content: '#fbfbfd' }] })
const router = useRouter()
const recents = useRecentsStore()
useSetupAgentTools()
const tab = ref<'pro' | 'fun'>('pro')
const themes = computed(() => THEMES.filter((t) => t.group === tab.value))
const scrolled = ref(false)
const tilt = reactive({ x: 0, y: 0 })

function solo() {
  const id = LOCAL_ROOM_PREFIX + randomId(9)
  try { sessionStorage.setItem(`retroboard:init:${id}`, JSON.stringify({ templateId: 'start-stop-continue', themeId: 'studio', title: t('landing.solo.title'), locale: locale.value })) } catch { /* ignore */ }
  void router.push({ path: '/board', hash: `#${id}` })
}

function onMove(e: PointerEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tilt.x = ((e.clientX - r.left) / r.width - 0.5) * 2
  tilt.y = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const onLeave = () => { tilt.x = 0; tilt.y = 0 }

onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 12 }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  const els = document.querySelectorAll<HTMLElement>('.lp [data-reveal]')
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((e) => e.classList.add('in'))
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) }
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' })
    els.forEach((e) => io.observe(e))
    onBeforeUnmount(() => io.disconnect())
  }
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})
</script>

<template>
  <div class="lp">
    <header class="nav" :class="{ scrolled }">
      <div class="nav-in">
        <NuxtLink to="/" class="brand" aria-label="RetroBoard"><span class="mark"><Icon name="lucide:layers" /></span>RetroBoard</NuxtLink>
        <nav class="links" :aria-label="t('landing.nav.label')">
          <a href="#features">{{ t('landing.nav.features') }}</a><a href="#themes">{{ t('landing.nav.themes') }}</a><a href="#how">{{ t('landing.nav.how') }}</a><a href="#privacy">{{ t('landing.nav.privacy') }}</a>
        </nav>
        <div class="right">
          <LocaleSwitch />
          <ProfileButton />
          <NuxtLink to="/new" class="cta sm" data-testid="nav-create">{{ t('landing.nav.create') }}</NuxtLink>
        </div>
      </div>
    </header>

    <main>
      <section class="hero">
        <span class="eyebrow" data-reveal><Icon name="lucide:sparkles" /> {{ t('landing.eyebrow') }}</span>
        <h1 data-reveal :style="{ '--d': '80ms' }" data-testid="hero-title">{{ t('landing.hero.a') }}<br />{{ t('landing.hero.b') }}</h1>
        <p class="sub" data-reveal :style="{ '--d': '160ms' }">{{ t('landing.sub') }}</p>
        <div class="actions" data-reveal :style="{ '--d': '240ms' }">
          <NuxtLink to="/new" class="cta" data-testid="hero-create">{{ t('landing.create') }} <Icon name="lucide:arrow-right" /></NuxtLink>
          <button class="ghost" type="button" data-testid="solo" @click="solo">{{ t('landing.trySolo') }}</button>
        </div>
        <ul v-if="recents.items.length" class="resume" data-reveal :style="{ '--d': '300ms' }">
          <li v-for="r in recents.items.slice(0, 3)" :key="r.id"><NuxtLink :to="{ path: '/board', hash: r.hash ?? `#${r.id}` }"><Icon name="lucide:rotate-ccw" /> {{ t('landing.resume', { title: r.title }) }}</NuxtLink></li>
        </ul>

        <div class="stage" data-reveal :style="{ '--d': '340ms' }" @pointermove="onMove" @pointerleave="onLeave">
          <div class="tilt" :style="{ transform: `perspective(1400px) rotateX(${-tilt.y * 2.5}deg) rotateY(${tilt.x * 3.5}deg)` }"><LandingHeroMock /></div>
        </div>
      </section>

      <section class="stats" data-reveal>
        <div><strong>0</strong><span>{{ t('landing.stat.accounts') }}</span></div>
        <div><strong>30</strong><span>{{ t('landing.stat.people') }}</span></div>
        <div><strong>{{ THEMES.length }}</strong><span>{{ t('landing.stat.themes') }}</span></div>
        <div><strong>24 h</strong><span>{{ t('landing.stat.erase') }}</span></div>
      </section>

      <section id="features" class="sec">
        <h2 data-reveal>{{ t('landing.features.h') }} <span class="dim">{{ t('landing.features.dim') }}</span></h2>
        <div class="bento">
          <article class="card wide" data-reveal>
            <div class="vis v-live" aria-hidden="true"><b :style="{ '--h': '210' }">A</b><b :style="{ '--h': '140' }">B</b><b :style="{ '--h': '320' }">C</b><b :style="{ '--h': '40' }">D</b><i class="ping" /></div>
            <h3>{{ t('landing.f.live.h') }}</h3><p>{{ t('landing.f.live.p') }}</p>
          </article>
          <article class="card" data-reveal :style="{ '--d': '80ms' }">
            <div class="vis v-private" aria-hidden="true"><i class="draft" /><i class="shared" /></div>
            <h3>{{ t('landing.f.private.h') }}</h3><p>{{ t('landing.f.private.p') }}</p>
          </article>
          <article class="card" data-reveal :style="{ '--d': '160ms' }">
            <div class="vis v-group" aria-hidden="true"><i /><i /><i /></div>
            <h3>{{ t('landing.f.group.h') }}</h3><p>{{ t('landing.f.group.p') }}</p>
          </article>
          <article class="card" data-reveal>
            <div class="vis v-timer" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="32" class="bg" /><circle cx="40" cy="40" r="32" class="fg" /></svg><span>05:00</span></div>
            <h3>{{ t('landing.f.timer.h') }}</h3><p>{{ t('landing.f.timer.p') }}</p>
          </article>
          <article class="card wide" data-reveal :style="{ '--d': '80ms' }">
            <div class="vis v-suggest" aria-hidden="true"><span>Mad / Sad / Glad</span><span>4 Ls</span><span>Voilier</span></div>
            <h3>{{ t('landing.f.suggest.h') }}</h3><p>{{ t('landing.f.suggest.p') }}</p>
          </article>
        </div>
      </section>

      <section id="themes" class="sec alt">
        <h2 data-reveal>{{ t('landing.themes.h') }}</h2>
        <p class="lead" data-reveal :style="{ '--d': '80ms' }">{{ t('landing.themes.lead') }}</p>
        <div class="tabs" data-reveal :style="{ '--d': '120ms' }" role="tablist">
          <button type="button" role="tab" :aria-selected="tab === 'pro'" data-testid="lp-tab-pro" @click="tab = 'pro'">{{ t('landing.themes.pro') }}</button>
          <button type="button" role="tab" :aria-selected="tab === 'fun'" data-testid="lp-tab-fun" @click="tab = 'fun'">{{ t('landing.themes.fun') }}</button>
        </div>
        <TransitionGroup name="tc" tag="div" class="theme-grid">
          <LandingThemeCard v-for="th in themes" :key="th.id" :theme="th" />
        </TransitionGroup>
      </section>

      <section id="how" class="sec">
        <h2 data-reveal>{{ t('landing.how.h') }}</h2>
        <ol class="steps">
          <li data-reveal><span class="n">1</span><h3>{{ t('landing.how.1.h') }}</h3><p>{{ t('landing.how.1.p') }}</p></li>
          <li data-reveal :style="{ '--d': '100ms' }"><span class="n">2</span><h3>{{ t('landing.how.2.h') }}</h3><p>{{ t('landing.how.2.p') }}</p></li>
          <li data-reveal :style="{ '--d': '200ms' }"><span class="n">3</span><h3>{{ t('landing.how.3.h') }}</h3><p>{{ t('landing.how.3.p') }}</p></li>
        </ol>
      </section>

      <section id="privacy" class="sec dark">
        <h2 data-reveal>{{ t('landing.privacy.h') }}</h2>
        <ul class="privacy">
          <li data-reveal><Icon name="lucide:user-round" /><strong>{{ t('landing.p.noaccount.h') }}</strong><span>{{ t('landing.p.noaccount.p') }}</span></li>
          <li data-reveal :style="{ '--d': '80ms' }"><Icon name="lucide:timer" /><strong>{{ t('landing.p.ephemeral.h') }}</strong><span>{{ t('landing.p.ephemeral.p') }}</span></li>
          <li data-reveal :style="{ '--d': '160ms' }"><Icon name="lucide:lock" /><strong>{{ t('landing.p.notrack.h') }}</strong><span>{{ t('landing.p.notrack.p') }}</span></li>
          <li data-reveal :style="{ '--d': '240ms' }"><Icon name="lucide:eye-off" /><strong>{{ t('landing.p.local.h') }}</strong><span>{{ t('landing.p.local.p') }}</span></li>
        </ul>
      </section>

      <section class="final" data-reveal>
        <h2>{{ t('landing.final') }}</h2>
        <NuxtLink to="/new" class="cta big">{{ t('landing.create') }} <Icon name="lucide:arrow-right" /></NuxtLink>
      </section>
    </main>

    <footer class="foot">
      <span>{{ t('landing.footer') }}</span>
      <NuxtLink to="/check" data-testid="link-check">{{ t('landing.check') }}</NuxtLink>
      <a href="https://github.com/maoudia/retroboard" rel="noopener" target="_blank">GitHub</a>
    </footer>
  </div>
</template>

<style>
html:has(.lp) { color-scheme: light !important; scroll-behavior: smooth; }
body:has(.lp) { background: #fbfbfd !important; color: #1d1d1f; }
</style>

<style scoped>
.lp { --ink: #1d1d1f; --ink2: #6e6e73; --line: #d2d2d7; --fill: #f5f5f7; --blue: #0071e3; --blue-d: #0062c4; position: relative; color: var(--ink); font-family: -apple-system, 'SF Pro Display', 'Inter Variable', system-ui, sans-serif; -webkit-font-smoothing: antialiased; overflow-x: clip; }
.lp h1, .lp h2, .lp h3 { font-family: inherit; font-weight: 700; }
[data-reveal] { opacity: 0; transform: translateY(26px) scale(.985); filter: blur(6px); transition: opacity .9s cubic-bezier(.16,1,.3,1) var(--d, 0ms), transform .9s cubic-bezier(.16,1,.3,1) var(--d, 0ms), filter .9s cubic-bezier(.16,1,.3,1) var(--d, 0ms); }
[data-reveal].in { opacity: 1; transform: none; filter: none; }

.nav { position: sticky; top: 0; z-index: 50; transition: background .3s, box-shadow .3s; }
.nav.scrolled { background: rgb(251 251 253 / .94); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); box-shadow: 0 1px 0 rgb(0 0 0 / .08); }
.nav-in { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; max-width: 1120px; height: 56px; margin: 0 auto; padding: 0 1.25rem; }
.brand { display: inline-flex; align-items: center; gap: .55rem; color: var(--ink); font-weight: 700; font-size: 1.05rem; letter-spacing: -.02em; text-decoration: none; }
.mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #0a84ff, #5e5ce6); color: #fff; font-size: 1rem; }
.links { display: flex; gap: 1.6rem; } .links a { color: #48484c; font-size: .88rem; text-decoration: none; transition: color .2s; } .links a:hover { color: var(--ink); }
.right { display: flex; align-items: center; gap: .8rem; }
.cta { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; padding: .85rem 1.6rem; border-radius: 999px; background: var(--blue); color: #fff; font-size: 1.05rem; font-weight: 600; text-decoration: none; transition: background .2s, transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s; box-shadow: 0 10px 24px -10px rgb(0 113 227 / .6); }
.cta:hover { background: var(--blue-d); transform: translateY(-2px) scale(1.02); } .cta:active { transform: scale(.98); }
.cta.sm { padding: .45rem 1rem; font-size: .88rem; box-shadow: none; } .cta.big { padding: 1rem 2rem; font-size: 1.15rem; }
.ghost { padding: .85rem 1.4rem; border: 0; border-radius: 999px; background: transparent; color: var(--blue); font: inherit; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: background .2s; }
.ghost:hover { background: rgb(0 113 227 / .08); }

.hero { display: grid; justify-items: center; gap: 1.4rem; max-width: 1120px; margin: 0 auto; padding: 4.5rem 1.25rem 3rem; text-align: center; }
.eyebrow { display: inline-flex; align-items: center; gap: .45rem; padding: .35rem .9rem; border-radius: 999px; background: var(--fill); color: var(--ink2); font-size: .85rem; font-weight: 600; }
.hero h1 { font-size: clamp(2.9rem, 8vw, 6rem); line-height: 1.02; letter-spacing: -.045em; background: linear-gradient(180deg, #1d1d1f 30%, #6e6e73); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { max-width: 620px; color: var(--ink2); font-size: clamp(1.1rem, 2.2vw, 1.4rem); line-height: 1.4; letter-spacing: -.01em; }
.actions { display: flex; flex-wrap: wrap; gap: .8rem; justify-content: center; }
.resume { list-style: none; display: flex; flex-wrap: wrap; gap: .5rem 1.2rem; justify-content: center; margin: 0; padding: 0; } .resume a { display: inline-flex; gap: .4rem; align-items: center; color: var(--ink2); font-size: .9rem; text-decoration: none; } .resume a:hover { color: var(--blue); }
.stage { width: min(960px, 100%); margin-top: 2rem; } .tilt { transition: transform .5s cubic-bezier(.2,.8,.2,1); will-change: transform; }

.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; max-width: 1000px; margin: 2rem auto 5rem; padding: 0 1.25rem; text-align: center; }
.stats strong { display: block; font-size: clamp(2rem, 5vw, 3.2rem); letter-spacing: -.04em; line-height: 1.1; } .stats span { color: var(--ink2); font-size: .95rem; }

.sec { max-width: 1120px; margin: 0 auto; padding: 5rem 1.25rem; text-align: center; }
.sec h2, .final h2 { font-size: clamp(2.1rem, 5.5vw, 3.6rem); letter-spacing: -.04em; line-height: 1.08; } .dim { color: #86868b; }
.sec.alt { max-width: none; background: var(--fill); } .sec.alt > * { max-width: 1120px; margin-inline: auto; }
.lead { max-width: 640px; margin: 1rem auto 0; color: var(--ink2); font-size: 1.2rem; line-height: 1.45; }

.bento { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 3rem; text-align: left; }
.card { display: grid; gap: .5rem; align-content: start; padding: 1.8rem; border-radius: 28px; background: var(--fill); transition: transform .5s cubic-bezier(.2,.8,.2,1), box-shadow .5s; overflow: hidden; }
.card:hover { transform: translateY(-4px); box-shadow: 0 24px 40px -24px rgb(0 0 0 / .25); } .card.wide { grid-column: span 2; }
.card h3 { font-size: 1.35rem; letter-spacing: -.02em; } .card p { color: var(--ink2); line-height: 1.45; }
.vis { display: flex; align-items: center; justify-content: center; gap: .5rem; height: 130px; margin-bottom: .6rem; border-radius: 18px; background: #fff; position: relative; overflow: hidden; }

.v-live b { display: grid; place-items: center; width: 44px; height: 44px; margin-left: -10px; border: 3px solid #fff; border-radius: 50%; background: hsl(var(--h) 75% 78%); font-size: .95rem; animation: bob 3s ease-in-out infinite; }
.v-live b:nth-child(2) { animation-delay: .4s; } .v-live b:nth-child(3) { animation-delay: .8s; } .v-live b:nth-child(4) { animation-delay: 1.2s; }
.ping { position: absolute; right: 22%; top: 28%; width: 12px; height: 12px; border-radius: 50%; background: #34c759; animation: ping 1.8s ease-out infinite; }
@keyframes bob { 50% { transform: translateY(-8px); } } @keyframes ping { 0% { box-shadow: 0 0 0 0 rgb(52 199 89 / .6); } 100% { box-shadow: 0 0 0 20px rgb(52 199 89 / 0); } }
.v-private .draft { position: absolute; left: 14%; width: 70px; height: 56px; border: 2px dashed #86868b; border-radius: 8px; animation: fly 4s cubic-bezier(.6,0,.2,1) infinite; }
.v-private .shared { position: absolute; right: 14%; width: 70px; height: 56px; border-radius: 8px; background: #fde68a; box-shadow: 0 8px 14px -8px rgb(0 0 0 / .4); animation: land 4s ease infinite; }
@keyframes fly { 0%, 20% { transform: translateX(0) rotate(0); opacity: 1; } 55% { transform: translateX(80px) translateY(-26px) rotate(8deg); opacity: .9; } 70%, 100% { transform: translateX(150px); opacity: 0; } }
@keyframes land { 0%, 55% { opacity: 0; transform: scale(.6) rotate(-10deg); } 70% { opacity: 1; transform: scale(1.08) rotate(2deg); } 80%, 100% { opacity: 1; transform: none; } }
.v-group i { position: absolute; width: 62px; height: 62px; border-radius: 8px; box-shadow: 0 8px 14px -8px rgb(0 0 0 / .4); }
.v-group i:nth-child(1) { background: #fbcfe8; animation: g1 4.5s ease-in-out infinite; } .v-group i:nth-child(2) { background: #bfdbfe; animation: g2 4.5s ease-in-out infinite; } .v-group i:nth-child(3) { background: #bbf7d0; animation: g3 4.5s ease-in-out infinite; }
@keyframes g1 { 0%, 25% { transform: translateX(-70px) rotate(-6deg); } 55%, 85% { transform: translate(-6px, 6px) rotate(-4deg); } 100% { transform: translateX(-70px) rotate(-6deg); } }
@keyframes g2 { 0%, 25% { transform: translateY(-4px); } 55%, 85% { transform: translate(0, 0) rotate(2deg); } 100% { transform: translateY(-4px); } }
@keyframes g3 { 0%, 25% { transform: translateX(70px) rotate(6deg); } 55%, 85% { transform: translate(6px, -6px) rotate(5deg); } 100% { transform: translateX(70px) rotate(6deg); } }
.v-timer svg { width: 96px; height: 96px; rotate: -90deg; } .v-timer circle { fill: none; stroke-width: 6; } .v-timer .bg { stroke: #ececf0; } .v-timer .fg { stroke: var(--blue); stroke-linecap: round; stroke-dasharray: 201; animation: ring 6s linear infinite; }
.v-timer span { position: absolute; font-weight: 700; font-variant-numeric: tabular-nums; } @keyframes ring { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 201; } }
.v-suggest { flex-direction: column; gap: 6px; } .v-suggest span { padding: .35rem .9rem; border-radius: 999px; background: var(--fill); font-size: .85rem; font-weight: 600; animation: pickme 6s ease infinite; } .v-suggest span:nth-child(2) { animation-delay: 2s; } .v-suggest span:nth-child(3) { animation-delay: 4s; }
@keyframes pickme { 0%, 30%, 100% { background: var(--fill); color: var(--ink); transform: none; } 8%, 24% { background: var(--blue); color: #fff; transform: scale(1.06); } }

.tabs { display: inline-flex; gap: 4px; margin-top: 1.6rem; padding: 4px; border-radius: 999px; background: #e8e8ed; }
.tabs button { padding: .5rem 1.4rem; border: 0; border-radius: 999px; background: transparent; color: var(--ink2); font: inherit; font-weight: 600; cursor: pointer; transition: background .25s, color .25s, box-shadow .25s; }
.tabs button[aria-selected="true"] { background: #fff; color: var(--ink); box-shadow: 0 2px 8px rgb(0 0 0 / .12); }
.theme-grid { position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.6rem; margin-top: 2.4rem; text-align: left; }
.tc-enter-active { transition: opacity .6s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.16,1,.3,1); } .tc-enter-from { opacity: 0; transform: translateY(20px) scale(.96); }
.tc-leave-active { position: absolute; opacity: 0; transition: opacity .2s; } .tc-move { transition: transform .5s cubic-bezier(.2,.8,.2,1); }

.steps { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin: 3rem 0 0; padding: 0; text-align: left; }
.steps .n { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 1rem; border-radius: 50%; background: var(--ink); color: #fff; font-weight: 700; }
.steps h3 { font-size: 1.5rem; letter-spacing: -.025em; margin-bottom: .4rem; } .steps p { color: var(--ink2); line-height: 1.5; font-size: 1.05rem; }

.sec.dark { max-width: none; background: #1d1d1f; color: #f5f5f7; } .sec.dark > * { max-width: 1120px; margin-inline: auto; } .sec.dark h2 { color: #f5f5f7; }
.privacy { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 3rem; padding: 0; text-align: left; }
.privacy li { display: grid; gap: .5rem; align-content: start; padding: 1.5rem; border-radius: 24px; background: #2a2a2d; } .privacy li :deep(svg) { font-size: 1.7rem; color: #64d2ff; }
.privacy strong { font-size: 1.15rem; } .privacy span { color: #a1a1a6; line-height: 1.45; font-size: .95rem; }

.final { display: grid; justify-items: center; gap: 1.8rem; padding: 7rem 1.25rem; text-align: center; }
.foot { display: flex; justify-content: space-between; max-width: 1120px; margin: 0 auto; padding: 1.5rem 1.25rem 2.5rem; border-top: 1px solid var(--line); color: var(--ink2); font-size: .85rem; } .foot a { color: var(--ink2); }

@media (max-width: 900px) { .links { display: none; } .bento { grid-template-columns: 1fr 1fr; } .card.wide { grid-column: span 2; } .stats { grid-template-columns: 1fr 1fr; row-gap: 2rem; } .steps { grid-template-columns: 1fr; } .privacy { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .bento { grid-template-columns: 1fr; } .card.wide { grid-column: auto; } .privacy { grid-template-columns: 1fr; } .hero { padding-top: 3rem; } }
@media (prefers-reduced-motion: reduce) { [data-reveal] { opacity: 1; transform: none; filter: none; transition: none; } .tilt { transition: none; } }
</style>
