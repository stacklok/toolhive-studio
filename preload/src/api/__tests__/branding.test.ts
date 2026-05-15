import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ARG_PREFIX = '--branding-css='

describe('preload branding API', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    vi.resetModules()
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  async function loadFresh(argv: string[]) {
    process.argv = argv
    return import('../branding')
  }

  it('exposes an empty string when the branding arg is absent', async () => {
    const mod = await loadFresh(['electron', 'app.js'])
    expect(mod.brandingApi.branding.css).toBe('')
  })

  it('exposes an empty string when the branding arg is empty', async () => {
    const mod = await loadFresh(['electron', 'app.js', ARG_PREFIX])
    expect(mod.brandingApi.branding.css).toBe('')
  })

  it('decodes a base64-encoded CSS payload', async () => {
    const css = ':root:not(.dark) { --primary: oklch(0.5 0.2 340); }'
    const encoded = Buffer.from(css, 'utf-8').toString('base64')
    const mod = await loadFresh([
      'electron',
      'app.js',
      `${ARG_PREFIX}${encoded}`,
    ])
    expect(mod.brandingApi.branding.css).toBe(css)
  })

  it('handles multi-byte unicode in the CSS payload', async () => {
    const css = '/* théme — 中文 */ .dark { --primary: #c2185b; }'
    const encoded = Buffer.from(css, 'utf-8').toString('base64')
    const mod = await loadFresh([
      'electron',
      'app.js',
      `${ARG_PREFIX}${encoded}`,
    ])
    expect(mod.brandingApi.branding.css).toBe(css)
  })
})
