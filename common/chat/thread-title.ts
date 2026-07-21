/**
 * Shared contract for optimistic / fallback thread titles.
 *
 * Main (`TitleService`) and the renderer (`useChatStreaming`) both derive
 * the user-message fallback from the same slice length so
 * `shouldAutoTitleThread` can recognize the optimistic title by equality
 * and still upgrade it to an LLM title.
 */
export const FALLBACK_TITLE_MAX_CHARS = 60

export function extractThreadTitleText(
  parts: ReadonlyArray<{
    type: string
    text?: string
  }>
): string {
  return parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        part.type === 'text' && typeof part.text === 'string'
    )
    .map((part) => part.text)
    .join(' ')
    .trim()
}

export function fallbackTitleFromParts(
  parts: ReadonlyArray<{ type: string; text?: string }>
): string {
  return extractThreadTitleText(parts).slice(0, FALLBACK_TITLE_MAX_CHARS)
}
