/**
 * Prerendered pages (ADR-0038) are served under a strict CSP without 'unsafe-inline': a style attribute written in
 * the markup would be refused by the browser (a bound :style only works once the script sets it through the CSSOM).
 * Iconify writes an empty style="" on every SVG; it is dropped here. Any other style attribute fails the build
 * instead of shipping a page the policy would break (the dev server only warns).
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    for (const part of ['head', 'bodyPrepend', 'body', 'bodyAppend'] as const) {
      html[part] = html[part].map((chunk) => chunk.replace(/ style=""/g, ''))
      const inline = / style="[^"]+"/.exec(html[part].join(''))
      if (!inline) continue
      const message = `[prerender] ${event.path}: inline style attribute in the ${part} (${inline[0].trim()}). Move it to a stylesheet or bind it after mount.`
      if (!import.meta.prerender) { console.warn(message); continue }
      console.error(message)
      throw createError({ statusCode: 500, statusMessage: 'Inline style attribute in prerendered markup' })
    }
  })
})
