/** Outcome of a use case. Errors are values, never thrown, so UI and agents handle them the same way. */
export type Result<E extends string = string> = { ok: true } | { ok: false; error: E }

export const ok = (): Result<never> => ({ ok: true })
export const err = <E extends string>(error: E): Result<E> => ({ ok: false, error })
