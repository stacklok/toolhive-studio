import { app } from 'electron'
import { blockQuit } from './block-quit'

export function register() {
  app.on('will-quit', (e) => blockQuit('will-quit', e))
}
