import { register as registerWhenReady } from './whenReady'
import { register as registerWindowAllClosed } from './window-all-closed'
import { register as registerActivate } from './activate'
import { register as registerWillFinishLaunching } from './will-finish-launching'
import { register as registerBeforeQuit } from './before-quit'
import { register as registerWillQuit } from './will-quit'
import { register as registerQuit } from './quit'
import { register as registerProcessSignals } from './process-signals'
import { register as registerProcessExit } from './process-exit'

export { blockQuit } from './block-quit'

export function registerAllEvents() {
  registerWillFinishLaunching()
  registerWhenReady()
  registerWindowAllClosed()
  registerActivate()
  registerBeforeQuit()
  registerWillQuit()
  registerQuit()
  registerProcessSignals()
  registerProcessExit()
}
