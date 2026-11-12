import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { createServer, type IncomingMessage } from 'node:http'

// Simple word+number format (e.g. "apple42") - hard to guess randomly but simple enough
// to avoid hallucination when testing with small models for performance.
const WORDS = [
  'apple',
  'banana',
  'cherry',
  'dragon',
  'eagle',
  'forest',
  'guitar',
  'hammer',
]

function generateSimpleCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${word}${num}`
}

export interface TestMcpServer {
  port: number
  secretCode: string
  bearerToken: string
  url: string
  stop: () => Promise<void>
}

async function readRequestBody(
  req: IncomingMessage
): Promise<Buffer | undefined> {
  if (
    req.method === 'GET' ||
    req.method === 'HEAD' ||
    req.method === 'DELETE'
  ) {
    return undefined
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  const body = Buffer.concat(chunks)
  return body.length > 0 ? body : undefined
}

function toFetchHeaders(req: IncomingMessage): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) {
      headers.append(key, v)
    }
  }
  return headers
}

function createTestMcpHandler(secretCode: string, serverName: string) {
  // ToolHive still probes remote streamable-HTTP endpoints with a Legacy
  // client during workload startup. SDK v2 handlers must accept Legacy there
  // while Studio negotiates Modern through the proxy.
  //
  // createMcpHandler invokes this factory once per HTTP request, so concurrent
  // clients each get an isolated McpServer instance (same isolation intent as
  // the old per-request McpServer + transport pattern / GHSA-345p-7cg4-v4c7).
  return createMcpHandler(() => {
    const server = new McpServer({
      name: serverName,
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

    return server
  })
}

async function startStreamableHttpMcpServer(options: {
  serverName: string
  healthPayload: Record<string, unknown>
}): Promise<TestMcpServer> {
  const secretCode = generateSimpleCode()
  const bearerToken = `token-${generateSimpleCode()}`
  const handler = createTestMcpHandler(secretCode, options.serverName)

  const httpServer = createServer(async (req, res) => {
    const host = req.headers.host ?? '127.0.0.1'
    const url = new URL(req.url ?? '/', `http://${host}`)

    if (req.method === 'GET' && url.pathname === '/') {
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(options.healthPayload))
      return
    }

    if (url.pathname !== '/mcp') {
      res.statusCode = 404
      res.end('Not found')
      return
    }

    if (req.method !== 'OPTIONS') {
      if (req.headers.authorization !== `Bearer ${bearerToken}`) {
        res.statusCode = 401
        res.end('Unauthorized')
        return
      }
    }

    try {
      const body = await readRequestBody(req)
      const response = await handler.fetch(
        new Request(url, {
          method: req.method,
          headers: toFetchHeaders(req),
          body: body ? new Uint8Array(body) : undefined,
        })
      )

      res.statusCode = response.status
      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      res.statusCode = 500
      res.end(String(error))
    }
  })

  return new Promise((resolve) => {
    httpServer.listen(0, () => {
      const address = httpServer.address()
      const port = typeof address === 'object' && address ? address.port : 0

      resolve({
        port,
        secretCode,
        bearerToken,
        url: `http://127.0.0.1:${port}/mcp`,
        stop: async () => {
          await new Promise<void>((res) => {
            httpServer.close(() => res())
          })
        },
      })
    })
  })
}

/** Legacy-protocol E2E coverage via SDK v2 server (accepts Legacy probes + Modern negotiation). */
export async function startTestMcpServer(): Promise<TestMcpServer> {
  return startStreamableHttpMcpServer({
    serverName: 'e2e-test-server',
    healthPayload: { status: 'ok' },
  })
}

/** Modern-protocol Playground path via SDK v2 server through ToolHive proxy. */
export async function startModernTestMcpServer(): Promise<TestMcpServer> {
  return startStreamableHttpMcpServer({
    serverName: 'e2e-modern-test-server',
    healthPayload: { status: 'ok', protocol: 'modern' },
  })
}
