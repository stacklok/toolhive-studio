import { describe, it, expect, afterAll, vi } from 'vitest'

vi.mock('../../logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { createServer, type Server } from 'node:http'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { connectWorkloadMcpClient } from '../mcp-tools'
import type { CoreWorkload } from '@common/api/generated/types.gen'

async function readRequestBody(
  req: import('node:http').IncomingMessage
): Promise<Uint8Array | undefined> {
  if (
    req.method === 'GET' ||
    req.method === 'HEAD' ||
    req.method === 'DELETE'
  ) {
    return undefined
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks)
  return body.length > 0 ? body : undefined
}

async function startModernMcpHttpServer(): Promise<{
  port: number
  secretCode: string
  url: string
  stop: () => Promise<void>
}> {
  const secretCode = 'modern42'
  const handler = createMcpHandler(
    () => {
      const server = new McpServer({
        name: 'modern-integration-server',
        version: '1.0.0',
      })

      server.registerTool(
        'get_secret_code',
        {
          description: 'Returns a secret code for testing',
          inputSchema: z.object({}),
        },
        async () => ({
          content: [{ type: 'text', text: secretCode }],
        })
      )

      server.registerResource(
        'app-html',
        'ui://modern-app',
        {
          description: 'Modern MCP App HTML',
          mimeType: 'text/html;profile=mcp-app',
        },
        async () => ({
          contents: [
            {
              uri: 'ui://modern-app',
              mimeType: 'text/html;profile=mcp-app',
              text: '<html><body>modern app</body></html>',
            },
          ],
        })
      )

      return server
    },
    { legacy: 'reject' }
  )

  let httpServer: Server | null = null

  const port = await new Promise<number>((resolve) => {
    httpServer = createServer(async (req, res) => {
      try {
        const host = req.headers.host ?? '127.0.0.1'
        const url = new URL(req.url ?? '/mcp', `http://${host}`)
        const body = await readRequestBody(req)
        const response = await handler.fetch(
          new Request(url, {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: body && body.length > 0 ? Buffer.from(body) : undefined,
          })
        )

        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          res.setHeader(key, value)
        })
        const responseBody = Buffer.from(await response.arrayBuffer())
        res.end(responseBody)
      } catch (error) {
        res.statusCode = 500
        res.end(String(error))
      }
    })

    httpServer.listen(0, '127.0.0.1', () => {
      const address = httpServer!.address()
      resolve(typeof address === 'object' && address ? address.port : 0)
    })
  })

  return {
    port,
    secretCode,
    url: `http://127.0.0.1:${port}/mcp`,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => (error ? reject(error) : resolve()))
      })
    },
  }
}

describe('native Modern MCP client integration', () => {
  let server: Awaited<ReturnType<typeof startModernMcpHttpServer>> | undefined

  afterAll(async () => {
    await server?.stop()
  })

  it('negotiates Modern, lists tools, executes them, and reads resources', async () => {
    server = await startModernMcpHttpServer()

    const workload: CoreWorkload = {
      name: 'modern-integration',
      port: server.port,
      transport_type: 'streamable-http',
      url: server.url,
      status: 'running',
    }

    const { client, close } = await connectWorkloadMcpClient(workload, {
      clientName: 'modern-integration-test',
    })

    try {
      expect(client.getProtocolEra()).toBe('modern')

      const { tools } = await client.listTools()
      expect(tools.map((tool) => tool.name)).toContain('get_secret_code')

      const result = await client.callTool({
        name: 'get_secret_code',
        arguments: {},
      })
      expect(result.content?.[0]).toMatchObject({
        type: 'text',
        text: server.secretCode,
      })

      const resource = await client.readResource({ uri: 'ui://modern-app' })
      const firstContent = resource.contents[0]
      expect(
        firstContent && 'text' in firstContent ? firstContent.text : undefined
      ).toContain('modern app')
    } finally {
      await close()
    }
  })

  it('rejects legacy-only clients against a strict Modern server', async () => {
    const legacyServer = await startModernMcpHttpServer()
    if (server) {
      await server.stop()
    }
    server = legacyServer

    const legacyClient = new Client(
      { name: 'legacy-probe', version: '1.0.0' },
      { versionNegotiation: { mode: 'legacy' } }
    )

    await expect(
      legacyClient.connect(
        new StreamableHTTPClientTransport(new URL(legacyServer.url))
      )
    ).rejects.toThrow()

    await legacyClient.close().catch(() => undefined)
  })
})
