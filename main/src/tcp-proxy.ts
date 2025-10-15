import net from 'node:net'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import log from './logger'

const execAsync = promisify(exec)

interface ProxyServer {
  server: net.Server
  bindAddress: string
  port: number
}

let activeProxies: ProxyServer[] = []

/**
 * Detect Docker bridge network gateway IPs on Linux
 * Returns common bridge IPs like 172.17.0.1, 172.20.0.1, etc.
 */
async function detectDockerBridgeIPs(): Promise<string[]> {
  if (process.platform !== 'linux') {
    return []
  }

  try {
    // Try to get Docker bridge IPs using ip route
    const { stdout } = await execAsync('ip route show | grep "docker\\|br-"')
    const bridgeIPs: string[] = []

    // Parse output like: "172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1"
    const lines = stdout.split('\n').filter((line) => line.trim())
    for (const line of lines) {
      const match = line.match(/src\s+(\d+\.\d+\.\d+\.\d+)/)
      if (match?.[1]) {
        bridgeIPs.push(match[1])
      }
    }

    if (bridgeIPs.length > 0) {
      log.info(
        `[TCP Proxy] Detected Docker bridge IPs: ${bridgeIPs.join(', ')}`
      )
      return bridgeIPs
    }
  } catch (error) {
    log.debug('[TCP Proxy] Could not detect bridge IPs via ip route:', error)
  }

  // Fallback to common Docker bridge IPs
  const commonBridges = ['172.17.0.1', '172.18.0.1', '172.19.0.1', '172.20.0.1']
  log.info(`[TCP Proxy] Using default bridge IPs: ${commonBridges.join(', ')}`)
  return commonBridges
}

/**
 * Start a TCP proxy that forwards traffic from bridgeIP:port to 127.0.0.1:port
 */
function createProxy(
  bridgeIP: string,
  port: number
): Promise<ProxyServer | null> {
  return new Promise((resolve) => {
    const server = net.createServer((clientSocket) => {
      // Connect to the actual ToolHive server on localhost
      const targetSocket = net.connect(port, '127.0.0.1', () => {
        // Pipe data bidirectionally
        clientSocket.pipe(targetSocket)
        targetSocket.pipe(clientSocket)
      })

      // Handle errors
      const cleanup = () => {
        clientSocket.destroy()
        targetSocket.destroy()
      }

      clientSocket.on('error', (err) => {
        log.debug(`[TCP Proxy] Client socket error: ${err.message}`)
        cleanup()
      })

      targetSocket.on('error', (err) => {
        log.debug(`[TCP Proxy] Target socket error: ${err.message}`)
        cleanup()
      })

      clientSocket.on('close', () => targetSocket.destroy())
      targetSocket.on('close', () => clientSocket.destroy())
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRNOTAVAIL' || err.code === 'EADDRINUSE') {
        log.debug(
          `[TCP Proxy] Cannot bind to ${bridgeIP}:${port} (${err.code})`
        )
      } else {
        log.warn(`[TCP Proxy] Error binding to ${bridgeIP}:${port}:`, err)
      }
      resolve(null)
    })

    server.listen(port, bridgeIP, () => {
      log.info(
        `[TCP Proxy] Listening on ${bridgeIP}:${port} -> 127.0.0.1:${port}`
      )
      resolve({ server, bindAddress: bridgeIP, port })
    })
  })
}

/**
 * Start TCP proxies on Linux to allow Docker containers to reach ToolHive
 * @param apiPort - The port ToolHive API is running on
 * @param mcpPort - The port ToolHive MCP is running on
 */
export async function startProxies(
  apiPort: number,
  mcpPort: number
): Promise<void> {
  if (process.platform !== 'linux') {
    log.debug('[TCP Proxy] Not on Linux, skipping proxy setup')
    return
  }

  log.info(
    `[TCP Proxy] Starting proxies for API port ${apiPort} and MCP port ${mcpPort}`
  )

  const bridgeIPs = await detectDockerBridgeIPs()
  const ports = [apiPort, mcpPort]

  for (const bridgeIP of bridgeIPs) {
    for (const port of ports) {
      const proxy = await createProxy(bridgeIP, port)
      if (proxy) {
        activeProxies.push(proxy)
      }
    }
  }

  if (activeProxies.length > 0) {
    log.info(`[TCP Proxy] Started ${activeProxies.length} proxy instances`)
  } else {
    log.warn('[TCP Proxy] No proxies could be started')
  }
}

/**
 * Stop all active TCP proxies
 */
export function stopProxies(): void {
  if (activeProxies.length === 0) {
    return
  }

  log.info(`[TCP Proxy] Stopping ${activeProxies.length} proxy instances`)

  for (const proxy of activeProxies) {
    try {
      proxy.server.close()
      log.debug(
        `[TCP Proxy] Stopped proxy on ${proxy.bindAddress}:${proxy.port}`
      )
    } catch (error) {
      log.warn(`[TCP Proxy] Error stopping proxy:`, error)
    }
  }

  activeProxies = []
  log.info('[TCP Proxy] All proxies stopped')
}

/**
 * Check if proxies are currently running
 */
export function areProxiesRunning(): boolean {
  return activeProxies.length > 0
}
