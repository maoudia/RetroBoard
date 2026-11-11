import { pseudoLocale, wantsPseudo } from '~/i18n'

/** `?lang=pseudo` shows the interface in the pseudo-locale for this page load only: nothing is stored and no menu offers it. */
export default defineNuxtPlugin(() => {
  pseudoLocale.value = wantsPseudo(window.location.search)
})
