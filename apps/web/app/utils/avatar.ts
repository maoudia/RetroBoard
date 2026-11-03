import type { Peer } from '@retroboard/domain'

/** Fallback hue from a name, only until the participant's own chosen hue has arrived. */
export const nameHue = (n: string | null): number => { let h = 0; for (const c of n ?? 'x') h = (h * 31 + c.charCodeAt(0)) % 360; return h }

/** The hue a participant chose in the profile (broadcast on connect), else the name fallback. */
export const peerHue = (p: Pick<Peer, 'hue' | 'name'>): number => p.hue ?? nameHue(p.name)

/** Same swatch as the profile dialog avatar picker. */
export const hueBg = (h: number): { background: string } => ({ background: `hsl(${h} 75% 78%)` })
