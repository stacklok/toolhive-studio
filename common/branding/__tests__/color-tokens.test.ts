import { describe, expect, it } from 'vitest'
import {
  colorTokensToStyleContent,
  tokensToCssDeclarations,
} from '@common/branding/color-tokens'

describe('tokensToCssDeclarations', () => {
  it('returns an empty string for undefined', () => {
    expect(tokensToCssDeclarations(undefined)).toBe('')
  })

  it('returns an empty string for an empty object', () => {
    expect(tokensToCssDeclarations({})).toBe('')
  })

  it('emits a known key with a valid value', () => {
    expect(tokensToCssDeclarations({ primary: '#ff6600' })).toBe(
      '--primary: #ff6600;'
    )
  })

  it('joins multiple keys with single spaces', () => {
    const out = tokensToCssDeclarations({
      primary: '#ff6600',
      secondary: '#0066ff',
    })
    expect(out).toBe('--primary: #ff6600; --secondary: #0066ff;')
  })

  it('drops unknown keys silently', () => {
    // ColorTokens permits any string key on the wire; the runtime allowlist
    // filters non-token keys before they're emitted as CSS variables.
    const out = tokensToCssDeclarations({
      'not-a-real-key': '#000',
      primary: '#fff',
    })
    expect(out).toBe('--primary: #fff;')
  })

  it.each([
    ['semicolon-injection', '#fff; background: url(x)'],
    ['closing-brace', '#fff }'],
    ['opening-comment', '/* nope'],
    ['closing-comment', '*/'],
    ['newline', '#fff\n--evil: 1'],
    ['empty-string', ''],
    ['over-length', 'a'.repeat(101)],
  ])('drops values rejected by the safety check (%s)', (_label, badValue) => {
    expect(tokensToCssDeclarations({ primary: badValue })).toBe('')
  })

  it('accepts oklch and hsl values', () => {
    const out = tokensToCssDeclarations({
      'nav-background': 'oklch(0.4282 0.0561 216.14)',
      sidebar: 'hsl(40 20% 98.5%)',
    })
    expect(out).toContain('--nav-background: oklch(0.4282 0.0561 216.14);')
    expect(out).toContain('--sidebar: hsl(40 20% 98.5%);')
  })
})

describe('colorTokensToStyleContent', () => {
  it('returns an empty string when theme is null', () => {
    expect(colorTokensToStyleContent(null)).toBe('')
  })

  it('returns an empty string when theme is empty', () => {
    expect(colorTokensToStyleContent({})).toBe('')
  })

  it('emits a :root:not(.dark) block for light overrides', () => {
    const out = colorTokensToStyleContent({ light: { primary: '#fff' } })
    expect(out).toBe(':root:not(.dark) { --primary: #fff; }')
  })

  it('emits a .dark block for dark overrides', () => {
    const out = colorTokensToStyleContent({ dark: { primary: '#000' } })
    expect(out).toBe('.dark { --primary: #000; }')
  })

  it('emits both blocks when both modes are set', () => {
    const out = colorTokensToStyleContent({
      light: { primary: '#fff' },
      dark: { primary: '#000' },
    })
    expect(out).toBe(
      ':root:not(.dark) { --primary: #fff; } .dark { --primary: #000; }'
    )
  })

  it('returns an empty string when every supplied value is invalid', () => {
    expect(
      colorTokensToStyleContent({
        light: { primary: 'color: red; }' },
      })
    ).toBe('')
  })
})
