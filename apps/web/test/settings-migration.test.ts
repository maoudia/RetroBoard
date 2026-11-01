import { describe, expect, it } from 'vitest'
import { migrate } from '../app/utils/settings-migration'

describe('stored settings migration', () => {
  it('drops the removed personal theme and keeps everything else', () => {
    expect(migrate({ themeMode: 'mine', myTheme: 'slate', sound: true, locale: 'en' })).toEqual({ sound: true, locale: 'en' })
  })
  it('keeps a valid variant and drops an unknown one', () => {
    expect(migrate({ variant: 'dark' })).toEqual({ variant: 'dark' })
    expect(migrate({ variant: 'sepia' })).toEqual({})
  })
  it('keeps a valid interface mode and drops an unknown one (change simple-advanced-mode)', () => {
    expect(migrate({ uiMode: 'advanced' })).toEqual({ uiMode: 'advanced' })
    expect(migrate({ uiMode: 'expert' })).toEqual({})
  })
})
