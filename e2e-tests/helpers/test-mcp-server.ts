import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import express from 'express'
import { z } from 'zod'
import type { Server } from 'http'

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
  req: express.Request
): Promise<Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  if (req.body && Buffer.isBuffer(req.body)) return req.body
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body))
  }
  return undefined
}

function createTestMcpHandler(secretCode: string, serverName: string) {
  // ToolHive still probes remote streamable-HTTP endpoints with a Legacy
  // client during workload startup. SDK v2 handlers must accept Legacy there
  // while Studio negotiates Modern through the proxy.
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

  const app = express()
  app.use(express.raw({ type: '*/*' }))

  app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    res.status(404).send('Not found')
  })
  app.get('/.well-known/oauth-protected-resource/mcp', (_req, res) => {
    res.status(404).send('Not found')
  })

  app.get('/', (_req, res) => {
    res.json(options.healthPayload)
  })

  app.all('/mcp', async (req, res) => {
    if (req.method !== 'OPTIONS') {
      const authHeader = req.headers.authorization
      if (authHeader !== `Bearer ${bearerToken}`) {
        res.status(401).send('Unauthorized')
        return
      }
    }

    try {
      const host = req.headers.host ?? '127.0.0.1'
      const url = new URL(req.url ?? '/mcp', `http://${host}`)
      const body = await readRequestBody(req)
      const response = await handler.fetch(
        new Request(url, {
          method: req.method,
          headers: req.headers as HeadersInit,
          body: body ? Buffer.from(body) : undefined,
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

  return new Promise((resolve) => {
    const httpServer: Server = app.listen(0, () => {
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
