import { webContents as webContentsApi } from 'electron'
import type { WebContents } from 'electron'
import log from '../../logger'
import type { ActiveStream } from './stream-registry-types'

export function safeSend(
  sender: WebContents,
  channel: string,
  payload: unknown
): boolean {
  try {
    if (sender.isDestroyed()) return false
    sender.send(channel, payload)
    return true
  } catch (error) {
    log.warn('[ACTIVE_STREAMS] Failed to send IPC payload:', error)
    return false
  }
}

/** Broadcast a stream-state change to every renderer window so UI
 * surfaces (e.g. the sidebar) can reflect activity for threads they
 * aren't currently subscribed to. */
export function broadcastState(
  chatId: string,
  status: 'streaming' | 'finished' | 'error'
): void {
  let allContents: WebContents[]
  try {
    allContents = webContentsApi.getAllWebContents()
  } catch {
    return
  }
  for (const wc of allContents) {
    safeSend(wc, 'chat:stream:state', { chatId, status })
  }
}

export function broadcast(
  stream: ActiveStream,
  channel: string,
  payload: unknown
): void {
  for (const sender of stream.subscribers) {
    if (!safeSend(sender, channel, payload)) {
      stream.subscribers.delete(sender)
    }
  }
}
