/**
 * The typed message channel between the page and the OneDrive worker (change user-drive-storage). The page holds the interface
 * (`SyncTargetPort`), the worker holds the network and the access token; between them travel sealed bytes, object paths and
 * error codes, and, after each token renewal, the new refresh token the page seals and keeps.
 */
import type { TargetErrorCode } from '@retroboard/application'

export interface OnedriveConfig {
  readonly clientId: string
  /** `https://login.microsoftonline.com/consumers` */
  readonly authority: string
  /** `https://graph.microsoft.com/v1.0` */
  readonly graph: string
  readonly redirectUri: string
}

export type WorkerRequest =
  | { readonly id: number; readonly op: 'config'; readonly config: OnedriveConfig }
  | { readonly id: number; readonly op: 'exchange'; readonly code: string; readonly verifier: string }
  | { readonly id: number; readonly op: 'restore'; readonly refreshToken: string }
  | { readonly id: number; readonly op: 'forget' }
  | { readonly id: number; readonly op: 'list'; readonly prefix: string }
  | { readonly id: number; readonly op: 'get'; readonly path: string }
  | { readonly id: number; readonly op: 'put'; readonly path: string; readonly bytes: Uint8Array; readonly ifMatch?: string }
  | { readonly id: number; readonly op: 'delete'; readonly path: string }
  | { readonly id: number; readonly op: 'stat'; readonly path: string }

export interface WorkerValue {
  readonly refreshToken?: string
  readonly objects?: readonly { path: string; size: number; etag: string; modifiedAt?: number }[]
  readonly found?: { bytes: Uint8Array; etag: string } | null
  readonly etag?: string
  readonly info?: { path: string; size: number; etag: string; modifiedAt?: number } | null
}

export type WorkerReply =
  | { readonly id: number; readonly ok: true; readonly value: WorkerValue }
  | { readonly id: number; readonly ok: false; readonly code: TargetErrorCode; readonly retryAfterMs?: number }
  /** The token endpoint handed out a new refresh token: the page seals and keeps it. */
  | { readonly event: 'refresh-token'; readonly refreshToken: string }
