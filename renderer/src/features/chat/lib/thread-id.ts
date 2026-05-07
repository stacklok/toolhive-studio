/**
 * Renderer-side draft thread id. Format MUST match `generateThreadId` in
 * `main/src/chat/threads-storage.ts` so `ensureThreadExists` can promote
 * it as-is on first send.
 */
export function generateDraftThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
