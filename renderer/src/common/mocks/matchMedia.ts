import { vi } from 'vitest'

export const matchMediaListeners: Record<string, Set<(e: Event) => void>> = {}
export const matchMediaMatches: Record<string, boolean> = {}

export function setupMatchMediaMock() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(function matchMedia(query: string) {
      matchMediaListeners[query] = matchMediaListeners[query] || new Set()
      matchMediaMatches[query] = matchMediaMatches[query] ?? false
      return {
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: (event: string, cb: (e: Event) => void) => {
          if (event === 'change') matchMediaListeners[query]?.add(cb)
        },
        removeEventListener: (event: string, cb: (e: Event) => void) => {
          if (event === 'change') matchMediaListeners[query]?.delete(cb)
        },
        dispatchEvent: (event: Event) => {
          if (event.type === 'change') {
            matchMediaListeners[query]?.forEach((cb) => cb(event))
          }
        },
        get matches() {
          return matchMediaMatches[query]
        },
      }
    }),
  })
}

export function setSystemTheme(isDark: boolean) {
  const query = '(prefers-color-scheme: dark)'
  matchMediaMatches[query] = isDark
  const event = new Event('change')
  Object.defineProperty(event, 'matches', { value: isDark })
  window.matchMedia(query).dispatchEvent(event)
}

export function resetMatchMediaState() {
  for (const key of Object.keys(matchMediaListeners)) {
    delete matchMediaListeners[key]
  }
  for (const key of Object.keys(matchMediaMatches)) {
    delete matchMediaMatches[key]
  }
}
