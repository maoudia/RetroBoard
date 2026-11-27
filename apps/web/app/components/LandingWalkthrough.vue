<script setup lang="ts">
const { t } = useT()
/**
 * The product walkthrough of the landing (change landing-v2-and-product-video, task 1.2): seven scenes of about six seconds,
 * drawn with HTML and CSS only (no video file, no inline style: the landing is prerendered under a strict CSP). One scene is
 * on screen at a time and the page moves to the next one on a timer; a button pauses it. With reduced motion the seven frames
 * are all shown, captioned, and nothing moves. The recording script (scripts/video/record-walkthrough.mjs) films this block.
 */
const SCENES = 7
const SCENE_MS = 6000
const scene = ref(0)
const playing = ref(true)
/** The caption is read aloud only after the visitor pressed play: a looping caption must not talk over a screen reader. */
const announce = ref(false)
const caption = (n: number) => t(`landing.video.c${n + 1}` as never)
const qr = Array.from({ length: 25 }, (_, i) => ((i * 7 + (i >> 2)) % 3 !== 0))
let timer: ReturnType<typeof setInterval> | undefined

function stop() { if (timer) { clearInterval(timer); timer = undefined } }
function start() { stop(); timer = setInterval(() => { scene.value = (scene.value + 1) % SCENES }, SCENE_MS) }
function toggle() {
  playing.value = !playing.value
  if (playing.value) { announce.value = true; start() } else stop()
}
function go(n: number) { scene.value = n; if (playing.value) start() }

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { playing.value = false; return }
  start()
})
onBeforeUnmount(stop)
</script>

<template>
  <div class="wt" :class="{ paused: !playing }" :data-scene="scene" data-testid="walkthrough" role="group" :aria-label="t('landing.video.label')">
    <div class="screen" :aria-live="announce ? 'polite' : 'off'">
      <figure v-for="n in SCENES" :key="n" class="scene" :class="[`s${n}`, { on: scene === n - 1 }]" :data-testid="`wt-scene-${n}`">
        <div class="frame" aria-hidden="true">
          <template v-if="n === 1">
            <div class="form">
              <b>{{ t('landing.video.format') }}</b>
              <div class="chips"><i>Start / Stop</i><i class="pick">4 Ls</i><i>Mad / Sad</i></div>
              <b>{{ t('landing.video.theme') }}</b>
              <div class="swatches"><i /><i class="pick" /><i /></div>
              <span class="btn">{{ t('landing.video.start') }}</span>
            </div>
          </template>
          <template v-else-if="n === 2">
            <div class="share">
              <span class="link">{{ t('landing.video.link') }}</span>
              <span class="qr"><i v-for="(on, i) in qr" :key="i" :class="{ on }" /></span>
              <span class="who"><b>A</b><b>B</b><b>C</b></span>
            </div>
          </template>
          <template v-else-if="n === 3">
            <div class="cols">
              <section v-for="c in 3" :key="c" class="col" :class="`c${c}`">
                <i class="draft" /><i class="note" />
              </section>
              <span class="btn publish">{{ t('landing.video.publish') }}</span>
            </div>
          </template>
          <template v-else-if="n === 4">
            <div class="grp">
              <span class="title">{{ t('landing.video.group') }}</span>
              <i class="note a">{{ t('landing.mock.n1') }}</i><i class="note b">{{ t('landing.mock.n2') }}</i>
            </div>
          </template>
          <template v-else-if="n === 5">
            <div class="vote">
              <span class="ring"><em>{{ t('landing.video.phase') }}</em></span>
              <div class="groups"><span class="g g1"><b>3</b></span><span class="g g2"><b>2</b></span><span class="g g3"><b>1</b></span></div>
              <span class="dots"><i /><i /><i /></span>
            </div>
          </template>
          <template v-else-if="n === 6">
            <div class="podium"><span class="p p2"><b>2</b></span><span class="p p1"><b>1</b></span><span class="p p3"><b>3</b></span></div>
          </template>
          <template v-else>
            <div class="act">
              <span class="item"><b>{{ t('landing.mock.n3') }}</b><em>{{ t('landing.video.owner') }}</em></span>
              <span class="btn exp">{{ t('landing.video.export') }}</span>
            </div>
          </template>
        </div>
        <figcaption>{{ caption(n - 1) }}</figcaption>
      </figure>
    </div>
    <div class="ctl">
      <button type="button" class="pp" data-testid="wt-toggle" :aria-pressed="!playing" :aria-label="playing ? t('landing.video.pause') : t('landing.video.play')" @click="toggle">
        <Icon :name="playing ? 'lucide:pause' : 'lucide:play'" />
      </button>
      <span class="pips">
        <button v-for="n in SCENES" :key="n" type="button" class="pip" :class="{ cur: scene === n - 1 }" :aria-current="scene === n - 1 ? 'step' : undefined" :aria-label="t('landing.video.scene', { n, caption: caption(n - 1) })" :data-testid="`wt-pip-${n}`" @click="go(n - 1)" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.wt { --ink: #1d1d1f; --blue: #0071e3; width: min(760px, 100%); margin: 2.5rem auto 0; text-align: left; }
.screen { padding: var(--sp-4); border: 1px solid #e5e5ea; border-radius: var(--r-card); background: #fff; box-shadow: 0 30px 60px -30px rgb(0 0 0 / .25); }
.scene { margin: 0; }
/* One scene at a time while it plays; every frame when motion is reduced. */
.scene:not(.on) { display: none; }
.frame { position: relative; display: grid; place-items: center; min-height: 250px; overflow: hidden; border-radius: var(--r-sm); background: #fbfbfd; border: 1px solid #ececf0; color: var(--ink); font-size: var(--fs-xs); }
figcaption { margin-top: var(--sp-3); color: var(--ink); font-size: var(--fs-lg); font-weight: 600; letter-spacing: -.01em; text-align: center; }
.btn { display: inline-block; padding: .4rem 1rem; border-radius: 999px; background: var(--blue); color: #fff; font-size: var(--fs-xs); font-weight: 700; }
.note { display: block; padding: .5rem .6rem; border-radius: var(--r-xs); background: #fde68a; color: var(--ink); font-style: normal; font-weight: 500; box-shadow: 0 6px 14px -8px rgb(0 0 0 / .3); }

.form { display: grid; gap: var(--sp-2); justify-items: start; width: min(300px, 90%); padding: var(--sp-4); border-radius: var(--r-card); background: #fff; border: 1px solid #ececf0; }
.chips, .swatches { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.chips i { padding: .25rem .6rem; border-radius: 999px; border: 1px solid #d2d2d7; font-style: normal; font-weight: 600; }
.chips i.pick { border-color: var(--blue); background: #e8f1ff; color: #0058b9; }
.swatches i { width: 28px; height: 20px; border-radius: var(--r-xs); background: #fde68a; border: 2px solid transparent; }
.swatches i:nth-child(2) { background: #bbf7d0; } .swatches i:nth-child(3) { background: #fbcfe8; } .swatches i.pick { border-color: var(--ink); }

.share { display: grid; gap: var(--sp-3); justify-items: center; }
.link { padding: .3rem .8rem; border-radius: 999px; background: #fff; border: 1px solid #d2d2d7; font-weight: 600; }
.qr { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; width: 90px; height: 90px; padding: 6px; background: #fff; border: 1px solid #d2d2d7; border-radius: var(--r-xs); }
.qr i { background: transparent; } .qr i.on { background: var(--ink); }
.who { display: flex; } .who b { display: grid; place-items: center; width: 30px; height: 30px; margin-left: -6px; border: 2px solid #fbfbfd; border-radius: 50%; background: hsl(var(--h, 210) 75% 78%); color: var(--ink); }
.who b:nth-child(2) { --h: 140; } .who b:nth-child(3) { --h: 320; }

.cols { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-3); width: 92%; padding-bottom: var(--sp-6); }
.col { display: grid; gap: var(--sp-2); align-content: start; min-height: 130px; padding: var(--sp-2); border-radius: var(--r-sm); background: #fff; border: 1px solid #ececf0; }
.col.c2 .draft, .col.c2 .note { background-color: #fbcfe8; } .col.c3 .draft, .col.c3 .note { background-color: #bbf7d0; }
.draft { height: 34px; border-radius: var(--r-xs); border: 2px dashed #86868b; }
.col .note { height: 34px; padding: 0; }
.publish { position: absolute; right: 0; bottom: 0; }

.grp { position: relative; width: min(280px, 90%); height: 170px; }
.grp .title { position: absolute; left: 0; top: 0; padding: .2rem .7rem; border-radius: 999px; background: var(--ink); color: #fff; font-weight: 700; }
.grp .note { position: absolute; width: 150px; }
.grp .a { left: 10px; top: 52px; } .grp .b { left: 22px; top: 62px; background: #fbcfe8; }

.vote { display: grid; grid-template-columns: auto 1fr; gap: var(--sp-4) var(--sp-5); align-items: center; width: min(420px, 92%); }
.ring { display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; background: conic-gradient(var(--blue) 0 55%, #e5e5ea 55% 100%); }
.ring em { display: grid; place-items: center; width: 62px; height: 62px; border-radius: 50%; background: #fbfbfd; font-style: normal; font-weight: 700; }
.groups { display: grid; gap: var(--sp-2); }
.g { display: flex; justify-content: space-between; align-items: center; padding: .4rem .6rem; border-radius: var(--r-xs); background: #fde68a; } .g2 { background: #fbcfe8; } .g3 { background: #bbf7d0; }
.g b { padding: 0 .5rem; border-radius: 999px; background: var(--ink); color: #fff; }
.dots { grid-column: 1 / -1; display: flex; gap: var(--sp-2); justify-content: center; } .dots i { width: 14px; height: 14px; border-radius: 50%; background: var(--blue); }

.podium { display: flex; align-items: flex-end; gap: var(--sp-2); height: 180px; }
.p { display: grid; place-items: start center; width: 80px; padding-top: var(--sp-2); border-radius: var(--r-xs) var(--r-xs) 0 0; background: #fde68a; transform-origin: bottom; }
.p b { font-size: var(--fs-xl); } .p1 { height: 170px; } .p2 { height: 120px; background: #e5e5ea; } .p3 { height: 85px; background: #fdba74; }

.act { display: grid; gap: var(--sp-4); justify-items: center; }
.item { display: grid; gap: var(--sp-1); min-width: 220px; padding: var(--sp-3) var(--sp-4); border-radius: var(--r-sm); background: #fff; border: 1px solid #ececf0; border-left: 4px solid var(--blue); }
.item em { color: #6e6e73; font-style: normal; }

.ctl { display: flex; align-items: center; justify-content: center; gap: var(--sp-4); margin-top: var(--sp-4); }
.pp { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid #d2d2d7; border-radius: 50%; background: #fff; color: var(--ink); font-size: var(--fs-lg); cursor: pointer; }
.pp:hover { background: #f5f5f7; }
.pp:focus-visible, .pip:focus-visible { outline: 2px solid var(--blue); outline-offset: 3px; }
.pips { display: flex; gap: var(--sp-1); }
/* A 24 px target around a 10 px dot. */
.pip { position: relative; width: 24px; height: 24px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.pip::before { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: #aeaeb2; }
.pip.cur::before { background: var(--blue); }

/* Motion: only the visible scene runs, and the pause button freezes it where it is. */
.s1.on .chips i.pick { animation: pick .5s 1s both; } .s1.on .swatches i.pick { animation: pick .5s 2s both; } .s1.on .btn { animation: press 1s 3.6s both; }
.s2.on .qr { animation: pop .5s .6s both; } .s2.on .link { animation: pop .5s .1s both; }
.s2.on .who b { animation: pop .5s both; } .s2.on .who b:nth-child(1) { animation-delay: 2s; } .s2.on .who b:nth-child(2) { animation-delay: 3s; } .s2.on .who b:nth-child(3) { animation-delay: 4s; }
.s3.on .c2 { --d: .6s; } .s3.on .c3 { --d: 1.2s; }
.s3.on .note { animation: reveal 0s 3.6s both; } .s3.on .draft { animation: pop .5s var(--d, 0s) both, away 0s 3.6s forwards; }
.s3.on .publish { animation: press 1s 3s both; }
.s4.on .title { animation: reveal 0s 3.4s both; } .s4.on .b { animation: slide 1.6s 1.4s both ease-in-out; } .s4.on .a { animation: pop .5s both; }
.s5.on .ring { animation: pop .5s both; } .s5.on .g { animation: pop .5s both; } .s5.on .g2 { animation-delay: .3s; } .s5.on .g3 { animation-delay: .6s; }
.s5.on .dots i { animation: spend .4s both; } .s5.on .dots i:nth-child(1) { animation-delay: 2s; } .s5.on .dots i:nth-child(2) { animation-delay: 3s; } .s5.on .dots i:nth-child(3) { animation-delay: 4s; }
.s6.on .p { animation: climb .9s both cubic-bezier(.2,.8,.2,1); } .s6.on .p2 { animation-delay: .5s; } .s6.on .p1 { animation-delay: 1.4s; } .s6.on .p3 { animation-delay: .1s; }
.s7.on .item { animation: pop .6s .3s both; } .s7.on .exp { animation: pop .6s 2.4s both; }
/* Text keeps full contrast at every frame (axe reads a mid-fade blend as low contrast): things pop, rise or appear, never fade. */
@keyframes pop { from { transform: scale(0); } 70% { transform: scale(1.08); } to { transform: scale(1); } }
@keyframes pick { from { transform: scale(1); } 50% { transform: scale(1.15); } to { transform: scale(1); } }
@keyframes press { 0%, 100% { transform: scale(1); } 40% { transform: scale(.88); } }
@keyframes reveal { from { visibility: hidden; } to { visibility: visible; } }
@keyframes away { to { visibility: hidden; } }
@keyframes slide { from { transform: translate(90px, 20px); } to { transform: translate(0, 0); } }
@keyframes spend { to { transform: scale(0); } }
@keyframes climb { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.wt.paused .scene * { animation-play-state: paused; }

@media (max-width: 640px) { .frame { min-height: 230px; } figcaption { font-size: var(--fs-md); } .vote { gap: var(--sp-3); } }
/* Reduced motion: the storyboard, seven captioned frames one after the other, nothing moves and nothing needs a button. */
@media (prefers-reduced-motion: reduce) {
  .wt { width: min(1000px, 100%); }
  .screen { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--sp-5) var(--sp-4); }
  .scene:not(.on) { display: block; }
  .scene * { animation: none !important; }
  .ctl { display: none; }
}
</style>
