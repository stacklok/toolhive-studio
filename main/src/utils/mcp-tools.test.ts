import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTransport } from './mcp-tools'
import type { CoreWorkload } from '@api/types.gen'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio'

vi.mock('../logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('createTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('streamable-http transport', () => {
    it('should use workload.url when provided for remote servers (Vercel)', () => {
      const workload: CoreWorkload = {
        name: 'vercel',
        port: 21454,
        transport_type: 'streamable-http',
        remote: true,
        url: 'http://127.0.0.1:21454',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('vercel')
      expect(config.transport).toBeInstanceOf(StreamableHTTPClientTransport)
    })

    it('should use workload.url when provided for remote servers (GitHub)', () => {
      const workload: CoreWorkload = {
        name: 'github-remote',
        port: 21153,
        transport_type: 'streamable-http',
        remote: true,
        url: 'http://127.0.0.1:21153/mcp',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('github-remote')
      expect(config.transport).toBeInstanceOf(StreamableHTTPClientTransport)
    })

    it('should use workload.url when provided for remote servers (Notion)', () => {
      const workload: CoreWorkload = {
        name: 'notion-remote',
        port: 48750,
        transport_type: 'streamable-http',
        remote: true,
        url: 'http://127.0.0.1:48750/mcp',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('notion-remote')
      expect(config.transport).toBeInstanceOf(StreamableHTTPClientTransport)
    })

    it('should fallback to /mcp path for local containers when url is missing', () => {
      const workload: CoreWorkload = {
        name: 'local-server',
        port: 36548,
        transport_type: 'streamable-http',
        remote: false,
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('local-server')
      expect(config.transport).toBeInstanceOf(StreamableHTTPClientTransport)
    })

    it('should use correct path for local containers with url provided', () => {
      const workload: CoreWorkload = {
        name: 'github',
        port: 36548,
        transport_type: 'streamable-http',
        remote: false,
        url: 'http://127.0.0.1:36548/mcp',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('github')
      expect(config.transport).toBeInstanceOf(StreamableHTTPClientTransport)
    })
  })

  describe('sse transport', () => {
    it('should construct SSE URL with correct format', () => {
      const workload: CoreWorkload = {
        name: 'oci-registry',
        port: 57839,
        transport_type: 'sse',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('oci-registry')
      expect(config.transport).toEqual(
        expect.objectContaining({
          url: 'http://localhost:57839/sse#oci-registry',
          type: 'sse',
        })
      )
    })
  })

  describe('stdio transport with proxy_mode', () => {
    it('should use streamable-http when proxy_mode is streamable-http', () => {
      const workload: CoreWorkload = {
        name: 'stdio-server',
        port: 40281,
        transport_type: 'stdio',
        proxy_mode: 'streamable-http',
        url: 'http://127.0.0.1:40281/mcp',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('stdio-server')
      expect(config.transport).toBeInstanceOf(StreamableHTTPClientTransport)
    })

    it('should use SSE when proxy_mode is sse', () => {
      const workload: CoreWorkload = {
        name: 'stdio-server-sse',
        port: 18890,
        transport_type: 'stdio',
        proxy_mode: 'sse',
        url: 'http://127.0.0.1:18890/sse#stdio-server-sse',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('stdio-server-sse')
      expect(config.transport).toEqual(
        expect.objectContaining({
          url: 'http://localhost:18890/sse#stdio-server-sse',
          type: 'sse',
        })
      )
    })

    it('should use SSE when URL contains /sse even without proxy_mode', () => {
      const workload: CoreWorkload = {
        name: 'stdio-server-url-sse',
        port: 18890,
        transport_type: 'stdio',
        url: 'http://127.0.0.1:18890/sse#stdio-server-url-sse',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('stdio-server-url-sse')
      expect(config.transport).toEqual(
        expect.objectContaining({
          url: 'http://localhost:18890/sse#stdio-server-url-sse',
          type: 'sse',
        })
      )
    })

    it('should use stdio transport when no proxy_mode and no /sse in URL', () => {
      const workload: CoreWorkload = {
        name: 'pure-stdio',
        port: 40281,
        transport_type: 'stdio',
        status: 'running',
      }

      const config = createTransport(workload)

      expect(config.name).toBe('pure-stdio')
      expect(config.transport).toBeInstanceOf(Experimental_StdioMCPTransport)
    })
  })
})
