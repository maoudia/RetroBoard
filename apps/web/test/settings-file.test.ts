import { describe, expect, it } from 'vitest'
import { buildSettingsFile, parseSettingsFile } from '../app/utils/settings-file'

const defaults = { sound: true, retentionDays: 30, uiMode: 'simple', defaultTheme: null as string | null }
const now = new Date('2026-11-03T10:00:00Z')

describe('settings file', () => {
  it('round-trips the settings', () => {
    const text = buildSettingsFile({ sound: false, retentionDays: 7, uiMode: 'advanced', defaultTheme: 'paper' }, now)
    expect(parseSettingsFile(text, defaults)).toEqual({ sound: false, retentionDays: 7, uiMode: 'advanced', defaultTheme: 'paper' })
  })
  it('is plain ASCII JSON with its format and version', () => {
    const f = JSON.parse(buildSettingsFile({ sound: true }, now))
    expect(f).toMatchObject({ format: 'retroboard-settings', version: 1, exportedAt: '2026-11-03T10:00:00.000Z' })
  })
  it('drops unknown keys and values of the wrong type', () => {
    const text = JSON.stringify({ format: 'retroboard-settings', version: 1, exportedAt: 'x', settings: { sound: 'yes', retentionDays: 3, evil: 1, __proto__: { x: 1 } } })
    expect(parseSettingsFile(text, defaults)).toEqual({ retentionDays: 3 })
  })
  it('keeps the Slack webhook on the device: never exported, never imported', () => {
    const text = buildSettingsFile({ sound: false, slackWebhook: 'https://hooks.slack.com/services/T0/B0/secret' }, now)
    expect(text).not.toContain('slackWebhook')
    expect(text).not.toContain('secret')
    const foreign = JSON.stringify({ format: 'retroboard-settings', version: 1, exportedAt: 'x', settings: { sound: true, slackWebhook: 'https://hooks.slack.com/services/T0/B0/other' } })
    expect(parseSettingsFile(foreign, { ...defaults, slackWebhook: '' })).toEqual({ sound: true })
  })
  it('refuses other files', () => {
    expect(parseSettingsFile('not json', defaults)).toBeNull()
    expect(parseSettingsFile('[]', defaults)).toBeNull()
    expect(parseSettingsFile(JSON.stringify({ format: 'other', version: 1, settings: {} }), defaults)).toBeNull()
    expect(parseSettingsFile(JSON.stringify({ format: 'retroboard-settings', version: 2, settings: {} }), defaults)).toBeNull()
  })
})
