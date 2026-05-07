/**
 * Generate a draft thread id in the renderer.
 *
 * Format mirrors the main process's `generateThreadId` in
 * `main/src/chat/threads-storage.ts` so a draft id is indistinguishable
 * from a persisted one. The id is used to drive the URL and the
 * `useChat` instance immediately, and only later "promoted" to a real DB
 * row by `ensureThreadExists` when the user sends the first message.
 */
export function generateDraftThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
