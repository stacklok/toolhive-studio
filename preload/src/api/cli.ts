import { ipcRenderer } from 'electron'
import type { ValidationResult } from '@common/types/cli'

export const cliApi = {
  cliAlignment: {
    getStatus: () => ipcRenderer.invoke('cli-alignment:get-status'),
    reinstall: () => ipcRenderer.invoke('cli-alignment:reinstall'),
    getPathStatus: () => ipcRenderer.invoke('cli-alignment:get-path-status'),
    getValidationResult: () =>
      ipcRenderer.invoke('cli-alignment:get-validation-result'),
    validate: () => ipcRenderer.invoke('cli-alignment:validate'),
    repair: () => ipcRenderer.invoke('cli-alignment:repair'),
  },
}

export interface CliAPI {
  cliAlignment: {
    getStatus: () => Promise<{
      isManaged: boolean
      cliPath: string
      cliVersion: string | null
      installMethod: 'symlink' | 'copy' | null
      symlinkTarget: string | null
      isValid: boolean
      lastValidated: string
    }>
    reinstall: () => Promise<{ success: boolean; error?: string }>
    getPathStatus: () => Promise<{
      isConfigured: boolean
      modifiedFiles: string[]
      pathEntry: string
    }>
    getValidationResult: () => Promise<ValidationResult | null>
    validate: () => Promise<ValidationResult>
    repair: () => Promise<{
      repairResult: { success: boolean; error?: string }
      validationResult: ValidationResult | null
    }>
  }
}
