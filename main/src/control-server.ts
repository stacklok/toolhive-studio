import {
  createServer,
  Server,
  IncomingMessage,
  ServerResponse,
  get,
} from 'node:http'
import { URL } from 'node:url'
import log from './logger'
import { handleDeepLink } from './deep-link'

const CONTROL_PORT = 51234 // Fixed port for control endpoint
const CONTROL_HOST = '127.0.0.1'

let controlServer: Server | null = null

/**
 * Start the HTTP control server for deep link navigation
 */
export function startControlServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (controlServer) {
      log.info('Control server already running')
      resolve()
      return
    }

    controlServer = createServer((req, res) => {
      handleControlRequest(req, res)
    })

    controlServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        log.warn(`Control server port ${CONTROL_PORT} already in use`)
        // This is fine - another instance might be running
        resolve()
      } else {
        log.error('Control server error:', error)
        reject(error)
      }
    })

    controlServer.listen(CONTROL_PORT, CONTROL_HOST, () => {
      log.info(
        `Control server listening on http://${CONTROL_HOST}:${CONTROL_PORT}`
      )
      resolve()
    })
  })
}

/**
 * Stop the HTTP control server
 */
export function stopControlServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!controlServer) {
      resolve()
      return
    }

    controlServer.close(() => {
      log.info('Control server stopped')
      controlServer = null
      resolve()
    })
  })
}

/**
 * Handle incoming control requests
 */
function handleControlRequest(req: IncomingMessage, res: ServerResponse): void {
  // Set CORS headers for local requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      handleHealthCheck(res)
    } else if (req.method === 'POST' && url.pathname === '/navigate') {
      handleNavigateRequest(req, res)
    } else if (req.method === 'GET' && url.pathname === '/navigate') {
      handleNavigateGet(url, res)
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  } catch (error) {
    log.error('Error handling control request:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}

/**
 * Handle health check requests
 */
function handleHealthCheck(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify({
      status: 'ok',
      service: 'toolhive-studio-control',
      timestamp: new Date().toISOString(),
    })
  )
}

/**
 * Handle POST /navigate requests with JSON body
 */
function handleNavigateRequest(
  req: IncomingMessage,
  res: ServerResponse
): void {
  let body = ''

  req.on('data', (chunk) => {
    body += chunk.toString()
  })

  req.on('end', () => {
    try {
      const data = JSON.parse(body)

      if (!data.url || typeof data.url !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing or invalid url parameter' }))
        return
      }

      // Validate that it's a toolhive:// URL
      if (!data.url.startsWith('toolhive://')) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'URL must start with toolhive://' }))
        return
      }

      // Handle the deep link
      handleDeepLink(data.url)
        .then(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({ success: true, message: 'Navigation handled' })
          )
        })
        .catch((err) => {
          log.error('Failed to handle deep link from control server:', err)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Failed to handle navigation' }))
        })
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    }
  })
}

/**
 * Handle GET /navigate requests with URL parameter
 */
function handleNavigateGet(url: URL, res: ServerResponse): void {
  const deepLinkUrl = url.searchParams.get('url')

  if (!deepLinkUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing url parameter' }))
    return
  }

  if (!deepLinkUrl.startsWith('toolhive://')) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'URL must start with toolhive://' }))
    return
  }

  // Handle the deep link
  handleDeepLink(deepLinkUrl)
    .then(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, message: 'Navigation handled' }))
    })
    .catch((err) => {
      log.error('Failed to handle deep link from control server:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Failed to handle navigation' }))
    })
}

/**
 * Get the control server URL
 */
export function getControlServerUrl(): string {
  return `http://${CONTROL_HOST}:${CONTROL_PORT}`
}

/**
 * Check if the control server is running (for external tools)
 */
export async function isControlServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const testReq = get(
      `${getControlServerUrl()}/health`,
      (res: IncomingMessage) => {
        resolve(res.statusCode === 200)
      }
    )

    testReq.on('error', () => {
      resolve(false)
    })

    testReq.setTimeout(1000, () => {
      testReq.destroy()
      resolve(false)
    })
  })
}
