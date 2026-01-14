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
}

export async function startTestMcpServer(): Promise<TestMcpServer> {
  const secretCode = generateSimpleCode()

  const mcpServer = new McpServer({
    name: 'e2e-test-server',
    version: '1.0.0',
  })

  mcpServer.tool(
    'get_secret_code',
    'Returns a secret code for testing',
    {},
    async () => ({
      content: [{ type: 'text', text: secretCode }],
    })
  )

  const app = express()
  app.use(express.json())

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })
  await mcpServer.connect(transport)

  // Handle OAuth discovery - return 404 to indicate no auth required
  app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    res.status(404).send('Not found')
  })
  app.get('/.well-known/oauth-protected-resource/mcp', (_req, res) => {
    res.status(404).send('Not found')
  })

  // Health check endpoint (app polls this)
  app.get('/', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.all('/mcp', async (req, res) => {
    await transport.handleRequest(req, res, req.body)
  })

  return new Promise((resolve) => {
    const httpServer: Server = app.listen(0, () => {
      const address = httpServer.address()
      const port = typeof address === 'object' && address ? address.port : 0

      resolve({
        port,
        secretCode,
        url: `http://127.0.0.1:${port}/mcp`,
        stop: async () => {
          await transport.close()
          await new Promise<void>((res) => {
            httpServer.close(() => res())
          })
        },
      })
    })
  })
}
