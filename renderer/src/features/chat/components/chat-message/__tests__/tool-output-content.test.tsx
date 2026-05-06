import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ToolOutputContent } from '../tool-output-content'

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: ReactNode }) => (
    <div data-testid="streamdown">{children}</div>
  ),
}))
vi.mock('@streamdown/code', () => ({ code: {} }))
vi.mock('@streamdown/mermaid', () => ({ mermaid: {} }))
vi.mock('@streamdown/cjk', () => ({ cjk: {} }))

describe('ToolOutputContent', () => {
  describe('MCP server response shape (output.content array)', () => {
    it('renders text items via Streamdown', () => {
      render(
        <ToolOutputContent
          status="ready"
          output={{
            content: [
              { type: 'text', text: 'Hello world' },
              { type: 'text', text: 'Another line' },
            ],
          }}
        />
      )
      const blocks = screen.getAllByTestId('streamdown')
      expect(blocks).toHaveLength(2)
      expect(blocks[0]).toHaveTextContent('Hello world')
      expect(blocks[1]).toHaveTextContent('Another line')
    })

    it('renders image items with a data URL when no `url` is provided', () => {
      render(
        <ToolOutputContent
          status="ready"
          output={{
            content: [
              {
                type: 'image',
                mimeType: 'image/png',
                data: 'AAAA',
                alt: 'Diagram',
              },
            ],
          }}
        />
      )
      const img = screen.getByAltText('Diagram')
      expect(img).toBeInTheDocument()
      expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA')
    })

    it('prefers `url` over inline base64 data when both are present', () => {
      render(
        <ToolOutputContent
          status="ready"
          output={{
            content: [
              {
                type: 'image',
                url: 'https://example.com/x.png',
                data: 'IGNORED',
                alt: 'Remote',
              },
            ],
          }}
        />
      )
      expect(screen.getByAltText('Remote').getAttribute('src')).toBe(
        'https://example.com/x.png'
      )
    })

    it('falls back to a JSON pre-block for unknown item types', () => {
      render(
        <ToolOutputContent
          status="ready"
          output={{
            content: [{ type: 'audio', data: 'ZZZZ' }],
          }}
        />
      )
      expect(screen.getByText(/Type: audio/)).toBeInTheDocument()
      expect(screen.getByText(/"data": "ZZZZ"/)).toBeInTheDocument()
    })
  })

  describe('non-MCP outputs', () => {
    it('renders a plain JSON pre-block when `output.content` is missing', () => {
      render(
        <ToolOutputContent status="ready" output={{ result: 42, ok: true }} />
      )
      const pre = screen.getByText(/"result": 42/)
      expect(pre.tagName).toBe('PRE')
      expect(pre).toHaveTextContent('"ok": true')
    })

    it('renders JSON for primitive outputs', () => {
      render(<ToolOutputContent status="ready" output="just a string" />)
      expect(screen.getByText(/"just a string"/)).toBeInTheDocument()
    })
  })
})
