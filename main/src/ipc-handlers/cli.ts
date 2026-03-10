import { ipcMain } from 'electron'
import {
  validateCliAlignment,
  handleValidationResult,
  getCliAlignmentStatus,
  reinstallCliSymlink,
  repairCliSymlink,
} from '../cli'
import { checkPathConfiguration } from '../cli/path-configurator'
import { getCliValidationResult, setCliValidationResult } from '../app-state'

export function register() {
  ipcMain.handle('cli-alignment:get-status', () => getCliAlignmentStatus())

  ipcMain.handle('cli-alignment:reinstall', () => reinstallCliSymlink())

  ipcMain.handle('cli-alignment:get-path-status', () =>
    checkPathConfiguration()
  )

  ipcMain.handle('cli-alignment:get-validation-result', () =>
    getCliValidationResult()
  )

  ipcMain.handle('cli-alignment:validate', async () => {
    const validation = await validateCliAlignment()
    const result = await handleValidationResult(validation)
    setCliValidationResult(result)
    return result
  })

  ipcMain.handle('cli-alignment:repair', async () => {
    const repairResult = await repairCliSymlink()
    if (repairResult.success) {
      const validation = await validateCliAlignment()
      const result = await handleValidationResult(validation)
      setCliValidationResult(result)
      return { repairResult, validationResult: result }
    }
    return { repairResult, validationResult: getCliValidationResult() }
  })
}
