import { isPrivatePath, parseIndexing } from '@retroboard/protocol'
import site from '../../site.json'

/**
 * Boards, join links, the browser check and the offline shell stay out of every index whatever the switch in site.json says:
 * the head `robots` meta follows the switch, a private route overrides it (change public-launch). The static shells carry
 * the same value from scripts/robots.mjs, so a crawler that does not run scripts sees it too.
 */
const INDEXABLE = parseIndexing(site.indexing) === 'public' ? 'index, follow' : 'noindex, nofollow'

export default defineNuxtPlugin(() => {
  const route = useRoute()
  useHead({ meta: [{ name: 'robots', content: computed(() => (isPrivatePath(route.path) ? 'noindex, nofollow' : INDEXABLE)) }] })
})
