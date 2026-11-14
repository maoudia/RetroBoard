<script setup lang="ts">
import { THEMES, type ThemeDefinition } from '@retroboard/themes'

defineProps<{ theme: ThemeDefinition }>()

/** One rule per theme, from the theme data: the landing is prerendered under a strict CSP, so colours are never style attributes. */
const swatchCss = THEMES.map(({ id, tokens: k, noteColors }) =>
  `.lp-swatch[data-theme="${id}"]{--bg:${k.bg};--bg2:${k.bg2};--sf:${k.surface};--bd:${k.border};--tx:${k.text};--mu:${k.muted};--ac:${k.accent};${noteColors.map((c, i) => `--n${i}:${c}`).join(';')}}`).join('')
// The prerendered tag stays out of the head manager in the browser: leaving the page would blank it, and CSP refuses
// that rewrite (no hash for an empty style). Arriving from another page, the tag is added at runtime, as before.
if (import.meta.server || !document.querySelector('style[data-hid="landing-swatches"]')) useHead({ style: [{ key: 'landing-swatches', innerHTML: swatchCss }] })
</script>

<template>
  <figure class="tc lp-swatch" :data-theme="theme.id">
    <div class="screen">
      <div class="top"><i class="logo" /><span class="t" /><span class="pillx" /></div>
      <div class="cols">
        <div v-for="c in 3" :key="c" class="c">
          <span class="h" />
          <i v-for="k in (c === 2 ? 2 : 3)" :key="k" class="n" />
        </div>
      </div>
    </div>
    <figcaption>
      <strong>{{ theme.name }}</strong>
      <small>{{ themeText(theme).tagline }}</small>
    </figcaption>
  </figure>
</template>

<style scoped>
.tc { margin: 0; display: grid; gap: .85rem; transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.tc:hover { transform: translateY(-6px); }
.screen { aspect-ratio: 16 / 10; padding: 12px; border-radius: 16px; background: linear-gradient(160deg, var(--bg), var(--bg2)); border: 1px solid color-mix(in srgb, var(--bd) 70%, #0000); box-shadow: 0 20px 40px -22px rgb(0 0 0 / .45); display: grid; grid-template-rows: auto 1fr; gap: 10px; overflow: hidden; }
.top { display: flex; align-items: center; gap: 8px; } .logo { width: 14px; height: 14px; border-radius: var(--r-xs); background: var(--ac); }
.t { width: 38%; height: 6px; border-radius: 3px; background: var(--tx); opacity: .75; } .pillx { margin-left: auto; width: 26px; height: 10px; border-radius: 99px; background: var(--ac); opacity: .85; }
.cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.c { display: grid; gap: 6px; align-content: start; padding: 7px; border-radius: var(--r-sm); background: var(--sf); border: 1px solid var(--bd); }
.h { width: 55%; height: 5px; border-radius: 3px; background: var(--mu); opacity: .8; }
.n { display: block; height: 18px; border-radius: 3px; rotate: var(--r); box-shadow: 0 3px 6px -3px rgb(0 0 0 / .4); }
/* The sticky notes: the theme's note colours around the loop, each leaning its own way. */
.c:nth-child(1) .n:nth-of-type(1) { background: var(--n3); --r: 1.6deg; } .c:nth-child(1) .n:nth-of-type(2) { background: var(--n4); --r: -1.6deg; } .c:nth-child(1) .n:nth-of-type(3) { background: var(--n5); --r: 0deg; }
.c:nth-child(2) .n:nth-of-type(1) { background: var(--n5); --r: -1.6deg; } .c:nth-child(2) .n:nth-of-type(2) { background: var(--n6); --r: 0deg; }
.c:nth-child(3) .n:nth-of-type(1) { background: var(--n7); --r: 0deg; } .c:nth-child(3) .n:nth-of-type(2) { background: var(--n0); --r: 1.6deg; } .c:nth-child(3) .n:nth-of-type(3) { background: var(--n1); --r: -1.6deg; }
figcaption { display: grid; gap: 2px; text-align: left; } figcaption strong { color: #1d1d1f; font-size: var(--fs-md); } figcaption small { color: #6e6e73; }
</style>
