import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ToolOutputContent } from '../tool-output-content'

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: ReactNode }) => (
    <div data-testid="streamdown">{children}</div>
  ),
}))
vi.mock('@streamdown/code', () => ({ code: {} }))
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

    it('renders JSON-shaped text as a pretty-printed pre, not Streamdown', () => {
      render(
        <ToolOutputContent
          status="ready"
          output={{
            content: [
              {
                type: 'text',
                text: '[{"id":1,"title":"PR"}]',
              },
            ],
          }}
        />
      )
      // No Streamdown for JSON content — the markdown engine is bypassed.
      expect(screen.queryByTestId('streamdown')).not.toBeInTheDocument()
      // Pretty-printed output is in the DOM.
      expect(screen.getByText(/"id": 1/)).toBeInTheDocument()
      expect(screen.getByText(/"title": "PR"/)).toBeInTheDocument()
      expect(screen.getByText(/^JSON ·/)).toBeInTheDocument()
    })

    it('treats text-shaped values that only look like JSON as plain text', () => {
      render(
        <ToolOutputContent
          status="ready"
          output={{
            content: [
              {
                type: 'text',
                text: '{not really json}',
              },
            ],
          }}
        />
      )
      // Failed parse → renders through Streamdown as before.
      expect(screen.getByTestId('streamdown')).toHaveTextContent(
        '{not really json}'
      )
    })

    it('renders very large non-JSON text as a raw <pre> with an opt-in markdown toggle', () => {
      const huge = 'a'.repeat(60_000)
      render(
        <ToolOutputContent
          status="ready"
          output={{ content: [{ type: 'text', text: huge }] }}
        />
      )

      // Streamdown is bypassed by default to avoid the freeze.
      expect(screen.queryByTestId('streamdown')).not.toBeInTheDocument()
      expect(screen.getByText(/Plain text · 60,000 chars/)).toBeInTheDocument()

      // Opting in flips to the Streamdown branch.
      fireEvent.click(
        screen.getByRole('button', { name: /render as markdown/i })
      )
      expect(screen.getByTestId('streamdown')).toBeInTheDocument()
    })

    it('truncates extremely large payloads in the rendered <pre> and surfaces a notice', () => {
      const enormous = 'b'.repeat(600_000)
      const { container } = render(
        <ToolOutputContent
          status="ready"
          output={{ content: [{ type: 'text', text: enormous }] }}
        />
      )
      expect(
        screen.getByText(/Plain text · 600,000 chars \(truncated\)/)
      ).toBeInTheDocument()

      // Avoid getByText's full text-node walk: the <pre> contains 600k b's
      // which makes the matcher do real work. Inspect the <pre> directly.
      const pre = container.querySelector('pre')
      expect(pre).not.toBeNull()
      expect(pre?.textContent).toMatch(/truncated, 100,000 more characters/)
      expect(pre?.textContent?.length).toBeLessThan(600_000)
    })

    it('always exposes a Copy button for raw blocks', () => {
      const writeText = vi.fn()
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      })

      const huge = 'c'.repeat(60_000)
      render(
        <ToolOutputContent
          status="ready"
          output={{ content: [{ type: 'text', text: huge }] }}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      expect(writeText).toHaveBeenCalledWith(huge)
    })

    it('Copy on a JSON block copies the original (un-prettified) text', () => {
      const writeText = vi.fn()
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      })

      const original = '[{"id":1}]'
      render(
        <ToolOutputContent
          status="ready"
          output={{ content: [{ type: 'text', text: original }] }}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      expect(writeText).toHaveBeenCalledWith(original)
    })
  })

  describe('non-MCP outputs', () => {
    it('renders a plain JSON pre-block when `output.content` is missing', () => {
      const { container } = render(
        <ToolOutputContent status="ready" output={{ result: 42, ok: true }} />
      )
      const pre = within(container).getByText(/"result": 42/)
      expect(pre.tagName).toBe('PRE')
      expect(pre).toHaveTextContent('"ok": true')
    })

    it('renders JSON for primitive outputs', () => {
      render(<ToolOutputContent status="ready" output="just a string" />)
      expect(screen.getByText(/"just a string"/)).toBeInTheDocument()
    })
  })
})
