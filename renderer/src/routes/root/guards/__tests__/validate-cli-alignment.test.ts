import { describe, it, expect, vi } from 'vitest'
import { validateCliAlignment } from '../validate-cli-alignment'

describe('validateCliAlignment', () => {
  it('skips validation on /cli-issue', async () => {
    window.electronAPI.cliAlignment = {
      ...window.electronAPI.cliAlignment,
      getValidationResult: vi.fn(),
    }

    await validateCliAlignment('/cli-issue')

    expect(
      window.electronAPI.cliAlignment.getValidationResult
    ).not.toHaveBeenCalled()
  })

  it('skips validation on /shutdown', async () => {
    window.electronAPI.cliAlignment = {
      ...window.electronAPI.cliAlignment,
      getValidationResult: vi.fn(),
    }

    await validateCliAlignment('/shutdown')

    expect(
      window.electronAPI.cliAlignment.getValidationResult
    ).not.toHaveBeenCalled()
  })

  it.each(['external-cli-found', 'symlink-broken', 'symlink-tampered'])(
    'throws redirect for actionable status: %s',
    async (status) => {
      window.electronAPI.cliAlignment = {
        ...window.electronAPI.cliAlignment,
        getValidationResult: vi.fn().mockResolvedValue({ status }),
      }

      await expect(validateCliAlignment('/')).rejects.toMatchObject({
        options: { to: '/cli-issue' },
      })
    }
  )

  it('does nothing when CLI alignment is valid', async () => {
    window.electronAPI.cliAlignment = {
      ...window.electronAPI.cliAlignment,
      getValidationResult: vi.fn().mockResolvedValue({ status: 'ok' }),
    }

    await expect(validateCliAlignment('/')).resolves.toBeUndefined()
  })

  it('does nothing when validation result is null', async () => {
    window.electronAPI.cliAlignment = {
      ...window.electronAPI.cliAlignment,
      getValidationResult: vi.fn().mockResolvedValue(null),
    }

    await expect(validateCliAlignment('/')).resolves.toBeUndefined()
  })
})
