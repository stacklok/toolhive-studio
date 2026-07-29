import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SSEClientTransport,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { buildMcpClientTransport } from '../mcp-tools'
import type { CoreWorkload } from '@common/api/generated/types.gen'

vi.mock('../../logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('buildMcpClientTransport', () => {
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

      const transport = buildMcpClientTransport(workload)

      expect(transport).toBeInstanceOf(StreamableHTTPClientTransport)
    })

    it('should fallback to /mcp path for local containers when url is missing', () => {
      const workload: CoreWorkload = {
        name: 'local-server',
        port: 36548,
        transport_type: 'streamable-http',
        remote: false,
        status: 'running',
      }

      const transport = buildMcpClientTransport(workload)

      expect(transport).toBeInstanceOf(StreamableHTTPClientTransport)
    })
  })

  describe('sse transport', () => {
    it('should construct an SSE transport', () => {
      const workload: CoreWorkload = {
        name: 'oci-registry',
        port: 57839,
        transport_type: 'sse',
        status: 'running',
      }

      const transport = buildMcpClientTransport(workload)

      expect(transport).toBeInstanceOf(SSEClientTransport)
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

      const transport = buildMcpClientTransport(workload)

      expect(transport).toBeInstanceOf(StreamableHTTPClientTransport)
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

      const transport = buildMcpClientTransport(workload)

      expect(transport).toBeInstanceOf(SSEClientTransport)
    })

    it('should reject unresolved direct stdio workloads', () => {
      const workload: CoreWorkload = {
        name: 'pure-stdio',
        port: 40281,
        transport_type: 'stdio',
        status: 'running',
      }

      expect(() => buildMcpClientTransport(workload)).toThrow(
        /no HTTP proxy endpoint/i
      )
    })
  })
})
