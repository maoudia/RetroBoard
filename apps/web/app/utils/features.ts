/**
 * Feature flags read from the public runtime config, in one place (change cursors-off-for-now).
 * The site is static: the value is the one given at build time (NUXT_PUBLIC_CURSORS_ENABLED).
 */

/** Shared pointers: sampling, frames, drawing, the laser and the Profile settings. Off by default. */
export const cursorsEnabled = (): boolean => useRuntimeConfig().public.cursorsEnabled === true
