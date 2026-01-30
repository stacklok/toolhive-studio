import { describe, it, expect } from 'vitest'
import { getUninstallCommand, getSourceLabel } from '../cli-issue-utils'

describe('cli-issue-utils', () => {
  describe('getUninstallCommand', () => {
    it('returns brew uninstall command for homebrew source', () => {
      expect(getUninstallCommand('homebrew')).toBe('brew uninstall thv')
    })

    it('returns winget uninstall command for winget source', () => {
      expect(getUninstallCommand('winget')).toBe('winget uninstall thv')
    })

    it('returns null for manual source', () => {
      expect(getUninstallCommand('manual')).toBeNull()
    })
  })

  describe('getSourceLabel', () => {
    it('returns "Homebrew" for homebrew source', () => {
      expect(getSourceLabel('homebrew')).toBe('Homebrew')
    })

    it('returns "Winget" for winget source', () => {
      expect(getSourceLabel('winget')).toBe('Winget')
    })

    it('returns "Manual installation" for manual source', () => {
      expect(getSourceLabel('manual')).toBe('Manual installation')
    })
  })
})
