import { COLUMN_ICONS } from '@retroboard/domain'

// Icons that are picked at runtime (columns, templates) cannot be found by the static scan.
const dynamicIcons = [
  ...COLUMN_ICONS,
  'users', 'list-checks', 'download', 'share-2', 'settings', 'timer', 'rotate-ccw', 'play', 'pause', 'lock',
  'lock-open', 'eye', 'eye-off', 'ellipsis-vertical', 'arrow-up-down', 'x', 'check', 'trash', 'pencil',
  'palette', 'wand-sparkles', 'sparkles', 'layers', 'ungroup', 'copy', 'link', 'file-text',
  'file-spreadsheet', 'file-json', 'send', 'user-round', 'chevron-down', 'grip-vertical', 'moon',
  'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'plus', 'dices', 'wifi-off', 'loader',
  'columns-3', 'message-square-plus', 'folder-output', 'list-plus', 'circle-check', 'triangle-alert',
].map((n) => `lucide:${n}`)

export default defineNuxtConfig({
  compatibilityDate: '2025-09-01',
  // Static SPA: `nuxt generate` emits plain files in .output/public, served by the Worker.
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxt/icon', '@nuxt/eslint'],
  css: ['~/assets/css/base.css', '~/assets/css/motion.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'RetroBoard',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'referrer', content: 'no-referrer' },
        { name: 'description', content: 'Retrospectives en temps reel, anonymes, avec des themes.' },
      ],
    },
  },
  hooks: {
    // No <link rel="prefetch">: Firefox checks prefetch against default-src 'none' (there is no
    // prefetch-src), so every hint was a CSP violation. Modulepreload of the entry stays.
    'build:manifest'(manifest) {
      for (const entry of Object.values(manifest)) entry.prefetch = false
    },
  },
  icon: {
    mode: 'svg',
    provider: 'none', // never call the Iconify API at runtime: bundle what we use
    fallbackToApi: false,
    serverBundle: 'local',
    clientBundle: { icons: dynamicIcons, scan: true },
  },
  runtimeConfig: {
    // Empty: same origin. Set NUXT_PUBLIC_WS_URL=ws://localhost:8787 for `nuxt dev` with `wrangler dev`.
    public: {
      wsUrl: '',
      // STUN only (no TURN, no paid service): lets two browsers find a direct path. Comma separated,
      // override with NUXT_PUBLIC_ICE_SERVERS (a self-hosted coturn, for example).
      iceServers: 'stun:stun.cloudflare.com:3478',
    },
  },
  // Static hoisting turns constant :style bindings into literal style attributes (innerHTML), which the CSP blocks.
  vue: { compilerOptions: { hoistStatic: false } },
  // Pure static output. Without this, Nitro detects Cloudflare Workers Builds and emits its own
  // worker config (.wrangler/deploy/config.json) that overrides ours and breaks `wrangler deploy`.
  nitro: { preset: 'static' },
  features: { inlineStyles: false },
  typescript: { strict: true },
  vite: { build: { sourcemap: false } },
})
