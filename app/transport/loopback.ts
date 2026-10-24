import { createBoard, reduce , buildSnapshot  } from '@retroboard/domain'
import { type Command, parseCommand } from '@retroboard/protocol'
import type { BoardState } from '@retroboard/domain'
import type { BoardTransport, Identity, TransportHandlers } from './types'

const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)

/**
 * Solo mode: the same domain reducer as the server, running in the browser.
 * Nothing leaves the page. Also the test double for the board store and the e2e demo.
 */
export class LoopbackTransport implements BoardTransport {
  private state: BoardState = createBoard({ newId })
  private identity: Identity | null = null

  constructor(private readonly handlers: TransportHandlers) {}

  connect(identity: Identity): void {
    this.identity = identity
    this.handlers.onStatus('open')
    this.emit()
  }

  send(command: Command): boolean {
    if (!this.identity) return false
    const cmd = parseCommand(command)
    if (!cmd) { this.handlers.onError('invalid'); return true }
    const out = reduce(this.state, cmd, {
      cid: this.identity.cid, name: this.identity.name || null, showName: this.identity.showName,
    }, { now: Date.now(), newId })
    if (out.ok) this.state = out.state
    else this.handlers.onError(out.error)
    this.emit()
    return true
  }

  updateIdentity(identity: Identity): void {
    this.identity = identity
    this.emit()
  }

  close(): void {
    this.handlers.onStatus('closed')
  }

  private emit(): void {
    if (!this.identity) return
    const { cid, name } = this.identity
    this.handlers.onSnapshot(buildSnapshot(this.state, { cid }, [{ name: name || null, me: true }], Date.now()))
  }
}
