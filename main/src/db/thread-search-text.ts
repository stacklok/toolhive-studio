/**
 * Plain text indexed for chat search: only `text` parts, joined with
 * newlines. Tool calls/outputs, reasoning and files are deliberately left
 * out — they're noisy, large, and not what people remember a chat by.
 */
export function extractSearchText(partsList: unknown[]): string {
  const chunks: string[] = []
  for (const parts of partsList) {
    if (!Array.isArray(parts)) continue
    for (const part of parts) {
      if (
        part &&
        typeof part === 'object' &&
        (part as { type?: unknown }).type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string'
      ) {
        chunks.push((part as { text: string }).text)
      }
    }
  }
  return chunks.join('\n')
}
