import { readdirSync, readFileSync } from 'node:fs'
import { COLUMN_ICONS, TEMPLATES } from '@retroboard/domain'
import { formatPath, parseIndexing } from '@retroboard/protocol'
import { parseChangelog } from './app/utils/changelog'

const appVersion = (JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }).version

/** The latest releases of CHANGELOG.md, read once at build time for the What's new page (nothing is fetched at runtime); no file, no notes. */
const releaseNotes = (() => {
  try { return parseChangelog(readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8')) } catch { return [] }
})()

/** Every page is a prerendered file (ADR-0034): the Worker never has to serve a shell for an app route. */
const pageRoutes = () => [
  ...readdirSync(new URL('./app/pages', import.meta.url), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.vue') && !f.includes('[') && !/(^|\/)formats\//.test(f)) // the format pages are listed below, with their trailing slash
    .map((f) => `/${f.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')}`),
  // One page per retro format and language, from the catalogue (change public-launch): a new format needs no page.
  ...(['fr', 'en'] as const).flatMap((lang) => [formatPath(null, lang), ...TEMPLATES.map((x) => formatPath(x.id, lang))]),
]

/** `none` keeps every page out of the index (before the launch, self-hosting); `public` indexes the public pages only, private routes add noindex themselves (plugins/robots.ts). */
const site = JSON.parse(readFileSync(new URL('./site.json', import.meta.url), 'utf8')) as { indexing?: unknown }
const robots = parseIndexing(site.indexing) === 'public' ? 'index, follow' : 'noindex, nofollow'

// Icons that are picked at runtime (columns, templates) cannot be found by the static scan.
const dynamicIcons = [
  ...COLUMN_ICONS,
  'users', 'list-checks', 'download', 'share-2', 'settings', 'timer', 'rotate-ccw', 'play', 'pause', 'lock',
  'lock-open', 'eye', 'eye-off', 'ellipsis-vertical', 'arrow-up-down', 'x', 'check', 'trash', 'pencil',
  'palette', 'wand-sparkles', 'sparkles', 'layers', 'ungroup', 'copy', 'link', 'file-text',
  'file-spreadsheet', 'file-json', 'send', 'user-round', 'chevron-down', 'grip-vertical', 'moon',
  'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'plus', 'dices', 'wifi-off', 'loader',
  'columns-3', 'message-square-plus', 'folder-output', 'list-plus', 'circle-check', 'triangle-alert', 'compass', 'monitor-x', 'pencil-off', 'chevrons-down', 'chevrons-up', 'octagon-x', 'scan-line', 'chevron-left', 'chevron-right', 'lock-open', 'chevron-up', 'minimize-2', 'unplug', 'refresh-cw', 'folder', 'square', 'maximize-2', 'move-horizontal', 'bug', 'lightbulb', 'message-circle', 'link-2-off', 'log-in',
].map((n) => `lucide:${n}`)

export default defineNuxtConfig({
  compatibilityDate: '2025-09-01',
  // Static site: `nuxt generate` emits plain files in .output/public, served by the Worker. The landing is
  // prerendered with its content (ADR-0038) so the first paint comes from the HTML, before any script; every
  // other route stays a client-rendered shell (a board needs the browser: crypto, storage, sockets).
  ssr: true,
  routeRules: { '/**': { ssr: false }, '/': { ssr: true }, '/formats/**': { ssr: true }, '/en/formats/**': { ssr: true }, '/whats-new': { ssr: true }, '/en/whats-new': { ssr: true } },
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
        { name: 'robots', content: robots },
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
      // The public client id of the Microsoft Entra app registration, when it is set at build time (NUXT_PUBLIC_ONEDRIVE_CLIENT_ID).
      // Empty: OneDrive is offered only if the deployment serves one in /providers.json (the Worker setting ONEDRIVE_CLIENT_ID).
      onedriveClientId: '',
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
  // NuxtLink prefetches the component chunks of the pages a link points to as soon as the link is visible: on the public pages that is the whole
  // board setup and poker bundles (and their CSS) fetched before the visitor asked for them. Prefetch on interaction (hover, focus) only.
  experimental: { payloadExtraction: false, defaults: { nuxtLink: { prefetch: true, prefetchOn: { visibility: false, interaction: true } } } },
  typescript: { strict: true },
  vite: { build: { sourcemap: false }, define: { __RELEASE_NOTES__: JSON.stringify(releaseNotes) } },
})
