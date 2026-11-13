import { readdirSync, readFileSync } from 'node:fs'
import { COLUMN_ICONS } from '@retroboard/domain'

const appVersion = (JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }).version

/** Every page is a prerendered file (ADR-0034): the Worker never has to serve a shell for an app route. */
const pageRoutes = () => readdirSync(new URL('./app/pages', import.meta.url), { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.vue'))
  .map((f) => `/${f.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')}`)

// Icons that are picked at runtime (columns, templates) cannot be found by the static scan.
const dynamicIcons = [
  ...COLUMN_ICONS,
  'users', 'list-checks', 'download', 'share-2', 'settings', 'timer', 'rotate-ccw', 'play', 'pause', 'lock',
  'lock-open', 'eye', 'eye-off', 'ellipsis-vertical', 'arrow-up-down', 'x', 'check', 'trash', 'pencil',
  'palette', 'wand-sparkles', 'sparkles', 'layers', 'ungroup', 'copy', 'link', 'file-text',
  'file-spreadsheet', 'file-json', 'send', 'user-round', 'chevron-down', 'grip-vertical', 'moon',
  'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'plus', 'dices', 'wifi-off', 'loader',
  'columns-3', 'message-square-plus', 'folder-output', 'list-plus', 'circle-check', 'triangle-alert', 'compass', 'monitor-x', 'pencil-off', 'chevrons-down', 'chevrons-up', 'octagon-x', 'scan-line', 'chevron-left', 'chevron-right', 'lock-open', 'chevron-up', 'minimize-2', 'square', 'maximize-2', 'move-horizontal', 'bug', 'lightbulb', 'message-circle', 'link-2-off',
].map((n) => `lucide:${n}`)

export default defineNuxtConfig({
  compatibilityDate: '2025-09-01',
  // Static site: `nuxt generate` emits plain files in .output/public, served by the Worker. The landing is
  // prerendered with its content (ADR-0038) so the first paint comes from the HTML, before any script; every
  // other route stays a client-rendered shell (a board needs the browser: crypto, storage, sockets).
  ssr: true,
  routeRules: { '/**': { ssr: false }, '/': { ssr: true } },
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxt/icon', '@nuxt/eslint'],
  css: ['~/assets/css/base.css', '~/assets/css/motion.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'RetroBoard',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', sizes: '32x32', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
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
      // Shown in the prefilled bug report (release-please keeps the root package.json up to date).
      appVersion,
      // STUN only (no TURN, no paid service): lets two browsers find a direct path. Comma separated,
      // override with NUXT_PUBLIC_ICE_SERVERS (a self-hosted coturn, for example).
      iceServers: 'stun:stun.cloudflare.com:3478',
    },
  },
  // Static hoisting turns constant :style bindings into literal style attributes (innerHTML), which the CSP blocks.
  vue: { compilerOptions: { hoistStatic: false } },
  // Pure static output. Without this, Nitro detects Cloudflare Workers Builds and emits its own
  // worker config (.wrangler/deploy/config.json) that overrides ours and breaks `wrangler deploy`.
  // App routes are files (`new.html`, not `new/index.html`): the asset layer serves `/new` directly instead of a 307
  // to `/new/` on every direct load and every invite link (the guide keeps its folders and trailing slashes).
  nitro: { preset: 'static', prerender: { crawlLinks: false, routes: pageRoutes(), autoSubfolderIndex: false } },
  features: { inlineStyles: false },
  // No _payload.json next to the prerendered landing: its payload is hydrated from the page itself and a client-side
  // navigation renders the route in the browser; the extracted file would only add a request (and under the
  // client-shell route rule it came out as HTML).
  experimental: { payloadExtraction: false },
  typescript: { strict: true },
  vite: { build: { sourcemap: false } },
})
