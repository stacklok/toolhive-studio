// this is a "polyfill" for RegExp.escape. It is already
// available in latest browsers and Node 24, but not available in
// Node 22 yet, so we use a polyfill for it until we migrate to 24
// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape#browser_compatibility
import RegexpEscape from 'regexp.escape'

export const highlight = (text: string, query: string): React.ReactNode => {
  if (!query) return text

  const regex = new RegExp(`(${RegexpEscape(query)})`, 'gi')

  return text.split(regex).map((part, i) =>
    i % 2 === 1 ? (
      <mark role="mark" aria-label={part} key={i}>
        {part}
      </mark>
    ) : (
      part
    )
  )
}
