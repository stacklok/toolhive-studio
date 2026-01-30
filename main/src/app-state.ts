import type { Tray } from 'electron'
import type { ValidationResult } from '@common/types/cli'

let isQuitting = false
let tearingDown = false
let tray: Tray | null = null
let cliValidationResult: ValidationResult | null = null

export function setQuittingState(quitting: boolean) {
  isQuitting = quitting
}

export function getQuittingState(): boolean {
  return isQuitting
}

export function setTearingDownState(tearing: boolean) {
  tearingDown = tearing
}

export function getTearingDownState(): boolean {
  return tearingDown
}

export function setTray(newTray: Tray | null) {
  tray = newTray
}

export function getTray(): Tray | null {
  return tray
}

export function setCliValidationResult(result: ValidationResult | null) {
  cliValidationResult = result
}

export function getCliValidationResult(): ValidationResult | null {
  return cliValidationResult
}
