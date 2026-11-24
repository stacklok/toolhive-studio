/**
 * Control characters that delimit highlighted hits inside a chat search
 * snippet. Chosen because they never appear in typed text, so the renderer
 * can split on them without HTML-escaping concerns.
 */
export const SEARCH_HIGHLIGHT_START = '\u0002'
export const SEARCH_HIGHLIGHT_END = '\u0003'
