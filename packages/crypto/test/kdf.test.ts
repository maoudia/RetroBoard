import { argon2id } from '@noble/hashes/argon2.js'
import { describe, expect, it } from 'vitest'
import {
  ARGON2ID_FLOOR, DEFAULT_ARGON2ID, type KdfParams, type KeyWrap, PBKDF2_FALLBACK, RECOVERY_QR_PREFIX, addRecoveryWrap, acceptablePassword,
  changePassword, createVaultInfo, deriveWrapKey, fromHex, generateRecoveryKey, isAcceptableKdf, parseRecoveryKey, passwordBytes,
  passwordStrength, randomBytes, toBase64Url, toHex, unlockWith, unlockWithPassword, unlockWithRecoveryKey, unwrapMasterKey, utf8, wrapMasterKey,
} from '../src'

const FLOOR: KdfParams = { id: 'argon2id', ...ARGON2ID_FLOOR }
const PASSWORD = 'correct horse battery'

describe('KDF parameters', () => {
  it('Argon2id matches the reference implementation, so the lazy import is the real function', async () => {
    const salt = fromHex('000102030405060708090a0b0c0d0e0f')
    const expected = argon2id(utf8('pw'), salt, { m: ARGON2ID_FLOOR.m, t: ARGON2ID_FLOOR.t, p: 1, dkLen: 32 })
    expect(toHex(await deriveWrapKey(utf8('pw'), salt, FLOOR))).toBe(toHex(expected))
  })
  it('accepts the floor, the default and the PBKDF2 fallback; refuses anything below, above or unknown', () => {
    for (const ok of [FLOOR, DEFAULT_ARGON2ID, PBKDF2_FALLBACK, { id: 'hkdf-sha256' } as const, { id: 'argon2id', m: 65_536, t: 4, p: 2 } as const]) expect(isAcceptableKdf(ok)).toBe(true)
    for (const bad of [
      { id: 'argon2id', m: 19 * 1024 - 1, t: 2, p: 1 }, { id: 'argon2id', m: 19 * 1024, t: 1, p: 1 }, { id: 'argon2id', m: 19 * 1024, t: 2, p: 0 },
      { id: 'argon2id', m: 1024 * 1024, t: 2, p: 1 }, { id: 'argon2id', m: 19 * 1024, t: 13, p: 1 }, { id: 'argon2id', m: 19 * 1024, t: 2, p: 5 },
      { id: 'argon2id', m: 19 * 1024.5, t: 2, p: 1 }, { id: 'pbkdf2-sha256', iterations: 599_999 }, { id: 'pbkdf2-sha256', iterations: 10_000_001 },
      { id: 'scrypt' },
    ] as unknown as KdfParams[]) expect(isAcceptableKdf(bad), JSON.stringify(bad)).toBe(false)
  })
  it('refuses to derive with parameters below the floor', async () => {
    await expect(deriveWrapKey(utf8('pw'), randomBytes(16), { id: 'argon2id', m: 1024, t: 1, p: 1 })).rejects.toThrow('refused')
  })
  it('derives with the PBKDF2 fallback and with HKDF', async () => {
    const salt = randomBytes(16)
    const a = await deriveWrapKey(utf8('pw'), salt, PBKDF2_FALLBACK)
    expect(a).toHaveLength(32)
    expect(await deriveWrapKey(utf8('pw'), salt, PBKDF2_FALLBACK)).toEqual(a)
    expect(await deriveWrapKey(utf8('pw'), salt, { id: 'hkdf-sha256' })).not.toEqual(a)
  })
  it('normalises a password, so one word typed two ways is one key', () => {
    expect(passwordBytes('été-pass')).toEqual(passwordBytes('été-pass'))
  })
})

describe('password wrap', () => {
  it('creates a vault info with no user data, wraps and unwraps, refuses a wrong password', async () => {
    const { info, master } = await createVaultInfo(PASSWORD, 1000, FLOOR)
    expect(info).toMatchObject({ version: 1, minReader: 1, cipher: 'aes-256-gcm', settings: {}, activeKeyId: { updatedTime: 1000 } })
    expect(info.vaultId).toMatch(/^[0-9a-f]{32}$/)
    expect(info.activeKeyId.value).toMatch(/^[0-9a-f]{16}$/)
    expect(info.wraps).toHaveLength(1)
    expect(info.wraps[0]).toMatchObject({ kind: 'password', kdf: FLOOR, updatedTime: 1000 })
    expect(JSON.stringify(info)).not.toContain(PASSWORD)
    const ok = await unlockWithPassword(info, PASSWORD)
    expect(ok?.master).toEqual(master)
    expect(ok?.keyId).toBe(info.activeKeyId.value)
    expect(await unlockWithPassword(info, 'correct horse batterz')).toBeNull()
    expect(await unlockWithPassword({ ...info, vaultId: 'another-vault' }, PASSWORD)).toBeNull()
  })
  it('uses the stored default and refuses a short password', async () => {
    const { info } = await createVaultInfo(PASSWORD, 1)
    expect(info.wraps[0]!.kdf).toEqual(DEFAULT_ARGON2ID)
    await expect(createVaultInfo('too short', 1)).rejects.toThrow('too short')
    expect(acceptablePassword('12345678901')).toBe(false)
    expect(acceptablePassword('123456789012')).toBe(true)
    expect(acceptablePassword('é'.repeat(12))).toBe(true)
  })
  it('still unlocks after the parameters were raised for new wraps, and after the fallback was used', async () => {
    const { info, master } = await createVaultInfo(PASSWORD, 1, FLOOR)
    const raised = await changePassword(info, master, PASSWORD, 2, { id: 'argon2id', m: 24 * 1024, t: 3, p: 1 })
    expect(raised.wraps[0]!.kdf).toEqual({ id: 'argon2id', m: 24 * 1024, t: 3, p: 1 })
    expect((await unlockWithPassword(raised, PASSWORD))?.master).toEqual(master)
    // The old wrap, with the old parameters, is still readable by a reader that still holds it.
    expect((await unlockWithPassword(info, PASSWORD))?.master).toEqual(master)
    const fallback = await changePassword(info, master, PASSWORD, 3, PBKDF2_FALLBACK)
    expect((await unlockWithPassword(fallback, PASSWORD))?.master).toEqual(master)
  })
  it('a password change re-wraps only: the master key and the recovery wrap stay, the old password stops working', async () => {
    const { info, master } = await createVaultInfo(PASSWORD, 1, FLOOR)
    const withRecovery = await addRecoveryWrap(info, master, 2)
    const changed = await changePassword(withRecovery.info, master, 'a brand new passphrase', 3, FLOOR)
    expect(changed.vaultId).toBe(info.vaultId)
    expect(changed.activeKeyId).toEqual(info.activeKeyId)
    expect(changed.wraps.map((w) => w.kind).sort()).toEqual(['password', 'recovery'])
    expect(changed.wraps.find((w) => w.kind === 'recovery')).toEqual(withRecovery.info.wraps.find((w) => w.kind === 'recovery'))
    expect(await unlockWithPassword(changed, PASSWORD)).toBeNull()
    expect((await unlockWithPassword(changed, 'a brand new passphrase'))?.master).toEqual(master)
    await expect(changePassword(changed, master, 'short', 4)).rejects.toThrow('too short')
  })
  it('tries the newest password wrap first and falls back to an older one', async () => {
    const { info, master } = await createVaultInfo(PASSWORD, 1, FLOOR)
    const newer = await wrapMasterKey(master, passwordBytes('another long password'), { vaultId: info.vaultId, keyId: info.activeKeyId.value, kind: 'password', kdf: FLOOR, now: 9 })
    const both = { ...info, wraps: [...info.wraps, newer] }
    expect((await unlockWithPassword(both, 'another long password'))?.master).toEqual(master)
    expect((await unlockWithPassword(both, PASSWORD))?.master).toEqual(master)
  })
  it('refuses a wrap that was weakened, tampered with or is malformed', async () => {
    const { info, master } = await createVaultInfo(PASSWORD, 1, FLOOR)
    const wrap = info.wraps[0]!
    const attempt = (w: Partial<KeyWrap>) => unwrapMasterKey({ ...wrap, ...w }, passwordBytes(PASSWORD), info.vaultId)
    expect(await attempt({})).toEqual(master)
    expect(await attempt({ kdf: { id: 'argon2id', m: 1024, t: 1, p: 1 } })).toBeNull()
    expect(await attempt({ kdf: { id: 'argon2id', m: 20 * 1024, t: 2, p: 1 } })).toBeNull()
    expect(await attempt({ keyId: 'ffffffffffffffff' })).toBeNull()
    expect(await attempt({ kind: 'recovery' })).toBeNull()
    expect(await attempt({ salt: 'not base64!' })).toBeNull()
    expect(await attempt({ wrapped: '***' })).toBeNull()
    expect(await attempt({ wrapped: toBase64Url(randomBytes(60)) })).toBeNull()
    expect(await unlockWith({ ...info, wraps: [] }, 'password', passwordBytes(PASSWORD))).toBeNull()
  })
})

describe('password strength hint', () => {
  it('ranks obvious passwords low and long random ones high, and never exceeds what the input is worth', () => {
    expect(passwordStrength('').bits).toBe(0)
    expect(passwordStrength('aaaaaaaaaaaa').level).toBe('weak')
    expect(passwordStrength('password1234').level).toBe('weak')
    expect(passwordStrength('correct horse battery').level).not.toBe('weak')
    expect(passwordStrength('Tr0ub4dor&3-Retro-Team').level).toBe('strong')
    expect(passwordStrength('glück-und-Wohlstand-42').bits).toBeGreaterThan(passwordStrength('glueck-und-wohlstand-42').bits - 1)
    const levels = ['weak', 'fair', 'good', 'strong']
    for (const p of ['abc', 'abcdefghijkl', 'Abcdefghijk1', 'Abcdefghijk1!xyzzyQ']) expect(levels).toContain(passwordStrength(p).level)
    expect(passwordStrength('Zx9!Qw3#Lm7$Pk5%').level).toBe('strong')
    expect(passwordStrength('Zx9Qw3LmPk5Rt').level).toBe('good')
    expect(passwordStrength('zxqwlmpkrtbn').level).toBe('fair')
  })
})

describe('recovery key', () => {
  it('is 160 random bits printed as eight groups and two check characters', () => {
    const a = generateRecoveryKey()
    expect(a.bytes).toHaveLength(20)
    expect(a.text).toMatch(/^([A-Z2-7]{4}-){8}[A-Z2-7]{2}$/)
    expect(a.qr).toMatch(/^RBR1:[A-Z2-7]{34}$/)
    expect(a.qr.slice(RECOVERY_QR_PREFIX.length)).toBe(a.text.replaceAll('-', ''))
    expect(generateRecoveryKey().text).not.toBe(a.text)
  })
  it('parses what was printed, in any case, with spaces, or from the QR payload', () => {
    const k = generateRecoveryKey()
    for (const form of [k.text, k.text.toLowerCase(), k.text.replaceAll('-', ' '), `  ${k.text}\n`, k.qr]) {
      const parsed = parseRecoveryKey(form)
      expect(parsed.ok && parsed.key.bytes).toEqual(k.bytes)
    }
  })
  it('detects every single-character typo and every swap of neighbours', () => {
    const k = generateRecoveryKey()
    const chars = k.text.replaceAll('-', '')
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    for (let i = 0; i < chars.length; i++) {
      for (const c of alphabet) {
        if (c === chars[i]) continue
        const typo = chars.slice(0, i) + c + chars.slice(i + 1)
        expect(parseRecoveryKey(typo).ok, `${i}${c}`).toBe(false)
      }
      if (i + 1 < chars.length && chars[i] !== chars[i + 1]) {
        const swapped = chars.slice(0, i) + chars[i + 1] + chars[i] + chars.slice(i + 2)
        expect(parseRecoveryKey(swapped).ok, `swap ${i}`).toBe(false)
      }
    }
  })
  it('says why a key is refused: length, characters or check', () => {
    const k = generateRecoveryKey()
    const chars = k.text.replaceAll('-', '')
    expect(parseRecoveryKey('')).toEqual({ ok: false, reason: 'length' })
    expect(parseRecoveryKey(chars.slice(1))).toEqual({ ok: false, reason: 'length' })
    expect(parseRecoveryKey(`1${chars.slice(1)}`)).toEqual({ ok: false, reason: 'characters' })
    expect(parseRecoveryKey(`${chars.slice(0, 32)}11`)).toEqual({ ok: false, reason: 'check' })
    const wrongCheck = chars.slice(0, 32) + (chars[32] === 'A' ? 'B' : 'A') + chars[33]
    expect(parseRecoveryKey(wrongCheck)).toEqual({ ok: false, reason: 'check' })
  })
  it('unlocks the vault when the password is lost, and sets a new password', async () => {
    const { info, master } = await createVaultInfo(PASSWORD, 1, FLOOR)
    const { info: withRecovery, recoveryKey } = await addRecoveryWrap(info, master, 2)
    expect(withRecovery.wraps.find((w) => w.kind === 'recovery')?.kdf).toEqual({ id: 'hkdf-sha256' })
    expect(JSON.stringify(withRecovery)).not.toContain(recoveryKey.text)
    const parsed = parseRecoveryKey(recoveryKey.text)
    if (!parsed.ok) throw new Error('parse')
    const unlocked = await unlockWithRecoveryKey(withRecovery, parsed.key)
    expect(unlocked?.master).toEqual(master)
    const reset = await changePassword(withRecovery, unlocked!.master, 'my new password again', 3, FLOOR)
    expect((await unlockWithPassword(reset, 'my new password again'))?.master).toEqual(master)
    expect(await unlockWithRecoveryKey(withRecovery, generateRecoveryKey())).toBeNull()
    expect(await unlockWithRecoveryKey(info, recoveryKey)).toBeNull()
  })
  it('replaces the recovery wrap when a new key is made, so the old key stops working', async () => {
    const { info, master } = await createVaultInfo(PASSWORD, 1, FLOOR)
    const first = await addRecoveryWrap(info, master, 2)
    const second = await addRecoveryWrap(first.info, master, 3)
    expect(second.info.wraps.filter((w) => w.kind === 'recovery')).toHaveLength(1)
    expect(await unlockWithRecoveryKey(second.info, first.recoveryKey)).toBeNull()
    expect((await unlockWithRecoveryKey(second.info, second.recoveryKey))?.master).toEqual(master)
  })
})
