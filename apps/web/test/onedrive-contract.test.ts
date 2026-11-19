import { type ContractFault, runSyncTargetContract } from '@retroboard/testkit'
import { createOnedriveClient } from '../app/adapters/sync/onedrive-client'
import { PAGE, REDIRECT, connect, fakeWithCode, loopbackWorker } from './onedrive-helpers'

/** The one mapping every contract fault needs: what the provider does, once. */
function inject(c: Awaited<ReturnType<typeof connect>>, fault: ContractFault) {
  if (fault === 'token-expired') {
    c.fake.expireAccessTokens()
    c.fake.fail({ status: 400, body: { error: 'invalid_grant' }, when: (r) => r.url.includes('/oauth2/v2.0/token') })
  } else if (fault === 'quota-full') c.fake.fail({ status: 507 })
  else c.dropNext()
}

// A revoked folder grant does not exist here: removing the app makes the refresh token fail, which is "token-expired".
const FAULTS: readonly ContractFault[] = ['token-expired', 'quota-full', 'offline']

runSyncTargetContract('onedrive (fake Graph, conditional writes through upload sessions)', async () => {
  const c = await connect()
  return { target: c.target, faults: FAULTS, inject: (f) => inject(c, f) }
})

runSyncTargetContract('onedrive (fake Graph, conditional writes through a simple PUT)', async () => {
  const c = await connect({ graph: { conditional: 'simple' } })
  return { target: c.target, faults: FAULTS, inject: (f) => inject(c, f) }
})

// The behaviour Microsoft does not document: the adapter must not depend on a simple PUT honouring a precondition.
runSyncTargetContract('onedrive (a provider whose simple PUT ignores If-Match and conflictBehavior)', async () => {
  const c = await connect({ simplePreconditions: false })
  return { target: c.target, faults: FAULTS, inject: (f) => inject(c, f) }
})

runSyncTargetContract('onedrive (a provider that does not create parent folders)', async () => {
  const c = await connect({ createsParents: false })
  return { target: c.target, faults: FAULTS, inject: (f) => inject(c, f) }
})

// The same contract through the typed message channel and the worker core: what the page really calls.
runSyncTargetContract('onedrive (through the worker message channel)', async () => {
  const { fake, verifier, code } = await fakeWithCode()
  const config = { clientId: fake.clientId, authority: fake.authority, graph: fake.graph, redirectUri: REDIRECT }
  let drop = false
  const page = fake.fetchFrom(PAGE)
  const fetchImpl = ((url: string, init?: RequestInit) => (drop ? (drop = false, Promise.reject(new TypeError('Failed to fetch'))) : page(url, init))) as typeof fetch
  const client = createOnedriveClient(config, () => loopbackWorker(fetchImpl))
  await client.exchange(code, verifier)
  return {
    target: client.target,
    faults: FAULTS,
    inject(fault) {
      if (fault === 'token-expired') {
        fake.expireAccessTokens()
        fake.fail({ status: 400, body: { error: 'invalid_grant' }, when: (r) => r.url.includes('/oauth2/v2.0/token') })
      } else if (fault === 'quota-full') fake.fail({ status: 507 })
      else drop = true
    },
  }
})
