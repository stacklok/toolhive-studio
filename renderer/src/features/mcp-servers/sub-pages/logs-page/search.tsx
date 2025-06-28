// const escapeRegExp = (str: string) =>
//   str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeRegExp = (query: string) => query

export const highlight = (text: string, query: string): React.ReactNode => {
  if (!query) return text

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')

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
