import type { Tray } from 'electron'

let isQuitting = false
let tearingDown = false
let tray: Tray | null = null

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
