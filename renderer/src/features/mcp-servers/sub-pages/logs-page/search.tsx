export const highlight = (text: string, query: string) => {
  if (!query) return text

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const queryLen = query.length

  const out: React.ReactNode[] = []
  let start = 0
  let idx: number

  while ((idx = lowerText.indexOf(lowerQuery, start)) !== -1) {
    if (idx > start) out.push(text.slice(start, idx))
    const innerText = text.slice(idx, idx + queryLen)
    out.push(
      <mark role="mark" aria-label={innerText} key={idx}>
        {innerText}
      </mark>
    )
    start = idx + queryLen
  }
  if (start < text.length) out.push(text.slice(start))

  return out
}
