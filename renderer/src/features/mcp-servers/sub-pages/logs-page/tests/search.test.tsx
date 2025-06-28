import { render, screen } from '@testing-library/react'
import { highlight } from '../search'

describe('highlight helper', () => {
  it('wraps nothign when query is empty', () => {
    render(<>{highlight('Hello world', '')}</>)
    expect(screen.queryByRole('mark')).toBeNull()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('handles multiple matches in the same line', () => {
    render(<>{highlight('foo middle foo', 'foo')}</>)
    const marks = screen.getAllByRole('mark')
    expect(marks).toHaveLength(2)
    expect(marks[0]).toHaveTextContent('foo')
    expect(marks[1]).toHaveTextContent('foo')
  })

  it('handles matches on multiple lines', () => {
    render(
      <>{highlight(['foo', 'middle', 'foo', 'bar', 'foo'].join('\n'), 'foo')}</>
    )
    const marks = screen.getAllByRole('mark')
    expect(marks).toHaveLength(3)
    expect(marks[0]).toHaveTextContent('foo')
    expect(marks[1]).toHaveTextContent('foo')
  })

  it('is case case-insensitive', () => {
    render(<>{highlight('FOO middle fOo', 'foo')}</>)
    const marks = screen.getAllByRole('mark')
    expect(marks).toHaveLength(2)
  })

  it('wraps nothing when no matches are found', () => {
    render(<>{highlight('Unrelated text', 'xyz')}</>)
    expect(screen.queryByRole('mark')).toBeNull()
    expect(screen.getByText('Unrelated text')).toBeInTheDocument()
  })
})
