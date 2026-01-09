import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
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
  url: string
  stop: () => Promise<void>
  getLogs: () => Promise<string[]>
}

export async function startTestMcpServer(): Promise<TestMcpServer> {
  const secretCode = generateSimpleCode()
  const logs: string[] = []

  const log = (msg: string) => logs.push(`${new Date().toISOString()} ${msg}`)

  const mcpServer = new McpServer({
    name: 'e2e-test-server',
    version: '1.0.0',
  })

  mcpServer.tool(
    'get_secret_code',
    'Returns a secret code for testing',
    {},
    async () => {
      log(`Tool called! Returning secret: ${secretCode}`)
      return {
        content: [{ type: 'text', text: secretCode }],
      }
    }
  )

  const app = express()
  app.use(express.json())

  // Log all requests for debugging
  app.use((req, _res, next) => {
    log(
      `${req.method} ${req.path} session=${req.headers['mcp-session-id'] ?? 'none'}`
    )
    next()
  })

  // Endpoint to retrieve logs
  app.get('/logs', (_req, res) => {
    res.json(logs)
  })

  // Handle OAuth discovery - return 404 to indicate no auth required
  app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    log('OAuth discovery requested - returning 404 (no auth)')
    res.status(404).send('Not found')
  })
  app.get('/.well-known/oauth-protected-resource/mcp', (_req, res) => {
    log('OAuth discovery for /mcp requested - returning 404 (no auth)')
    res.status(404).send('Not found')
  })

  // Health check endpoint (app polls this)
  app.get('/', (_req, res) => {
    res.json({ status: 'ok' })
  })

  const sessions = new Map<string, StreamableHTTPServerTransport>()

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    let transport = sessionId ? sessions.get(sessionId) : undefined

    // Log request body for debugging
    const bodyStr = JSON.stringify(req.body)
    log(
      `POST /mcp body: ${bodyStr.substring(0, 200)}${bodyStr.length > 200 ? '...' : ''}`
    )

    if (!transport) {
      log(`Creating new transport for session`)
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          log(`Session initialized: ${id}`)
          sessions.set(id, transport!)
        },
      })
      await mcpServer.connect(transport)
    }

    await transport.handleRequest(req, res, req.body)
    log(`POST /mcp completed`)
  })

  // GET for SSE streaming (needed for tool call responses)
  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string
    const transport = sessions.get(sessionId)
    if (!transport) {
      res.status(400).send('No session found')
      return
    }
    await transport.handleRequest(req, res)
  })

  // DELETE for session cleanup
  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string
    const transport = sessions.get(sessionId)
    if (transport) {
      await transport.handleRequest(req, res)
      sessions.delete(sessionId)
    } else {
      res.status(400).send('No session found')
    }
  })

  return new Promise((resolve) => {
    const httpServer: Server = app.listen(0, () => {
      const address = httpServer.address()
      const port = typeof address === 'object' && address ? address.port : 0

      resolve({
        port,
        secretCode,
        url: `http://127.0.0.1:${port}/mcp`,
        stop: () =>
          new Promise<void>((res) => {
            sessions.forEach((t) => t.close())
            httpServer.close(() => res())
          }),
        getLogs: async () => {
          const resp = await fetch(`http://localhost:${port}/logs`)
          return resp.json()
        },
      })
    })
  })
}
