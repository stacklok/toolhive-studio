import { spawn } from 'node:child_process'
import { existsSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { app } from 'electron'
import { updateTrayStatus } from './system-tray'
import log from './logger'
import * as Sentry from '@sentry/electron/main'
import { getQuittingState } from './app-state'
import { readSetting } from './db/readers/settings-reader'
import { createEnhancedPath } from './utils/enhanced-path'
import {
  ALREADY_RUNNING,
  REGISTRY_AUTH_REQUIRED,
  type ToolhiveProcessError,
  type ToolhiveStatus,
} from '../../common/types/toolhive-status'

const binName = process.platform === 'win32' ? 'thv.exe' : 'thv'
const binPath = app.isPackaged
  ? path.join(
      process.resourcesPath,
      'bin',
      `${process.platform}-${process.arch}`,
      binName
    )
  : path.resolve(
      __dirname,
      '..',
      '..',
      'bin',
      `${process.platform}-${process.arch}`,
      binName
    )

let toolhiveProcess: ReturnType<typeof spawn> | undefined
let toolhiveMcpPort: number | undefined
let toolhiveSocketPath: string | undefined
let isRestarting = false
let isStopping = false
let killTimer: NodeJS.Timeout | undefined
let processError: ToolhiveProcessError | undefined

export function getToolhiveMcpPort(): number | undefined {
  return toolhiveMcpPort
}

export function getToolhiveSocketPath(): string | undefined {
  return toolhiveSocketPath
}

export function isToolhiveRunning(): boolean {
  // When THV_SOCKET points at an externally managed thv we never spawn a
  // child process, but the API is still reachable. Treat that as "running"
  // so renderer guards (e.g. setupSecretProvider) and tray UI behave the
  // same as in the bundled-binary case.
  if (isUsingCustomSocket()) return true
  const isRunning = !!toolhiveProcess && !toolhiveProcess.killed && !isStopping
  return isRunning
}

export function getToolhiveStatus(): ToolhiveStatus {
  return {
    isRunning: isToolhiveRunning(),
    processError,
  }
}

/**
 * Returns whether the app is using an externally managed thv reachable over
 * a custom UNIX socket / Windows named pipe (THV_SOCKET env var).
 */
export function isUsingCustomSocket(): boolean {
  return !app.isPackaged && !!process.env.THV_SOCKET
}

/**
 * Parses THV_MCP_PORT into a positive integer. Returns `undefined` for
 * unset / blank / non-numeric / out-of-range values and logs a warning so
 * a typo doesn't silently turn into NaN being treated as a real port.
 */
function parseMcpPortEnv(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const port = Number(raw)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    log.warn(
      `Ignoring invalid THV_MCP_PORT=${raw}; expected an integer in 1..65535`
    )
    return undefined
  }
  return port
}

async function findFreePort(
  minPort?: number,
  maxPort?: number
): Promise<number> {
  const checkPort = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer()
      server.listen(port, () => {
        server.close(() => resolve(true))
      })
      server.on('error', () => resolve(false))
    })
  }

  const getRandomPort = (): Promise<number> => {
    return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.listen(0, () => {
        const address = server.address()
        if (typeof address === 'object' && address && address.port) {
          const port = address.port
          server.close(() => resolve(port))
        } else {
          reject(new Error('Failed to get random port'))
        }
      })
      server.on('error', reject)
    })
  }

  // If no range specified, use OS assignment directly
  if (!minPort || !maxPort) {
    return await getRandomPort()
  }

  // Try random ports within range for better distribution
  const attempts = Math.min(20, maxPort - minPort + 1)
  const triedPorts = new Set<number>()

  for (let i = 0; i < attempts; i++) {
    const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort

    if (triedPorts.has(port)) continue
    triedPorts.add(port)

    if (await checkPort(port)) {
      return port
    }
  }

  // Fallback to OS-assigned random port
  log.warn(
    `No free port found in range ${minPort}-${maxPort}, falling back to random port`
  )
  return await getRandomPort()
}

function generateSocketPath(): string {
  // Windows AF_UNIX sockets created in %TEMP% hit EACCES on connect due to
  // DACL handling. Named pipes are the canonical Windows IPC and are
  // supported natively by Node's http.request({ socketPath }) and Go's
  // Microsoft/go-winio.
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\toolhive-${process.pid}`
  }
  const socketName = `toolhive-${process.pid}.sock`
  return path.join(app.getPath('temp'), socketName)
}

function cleanupSocketFile(socketPath: string): void {
  // Named pipes are released by the kernel when the listener exits; there's
  // no filesystem entry to remove.
  if (process.platform === 'win32') return
  try {
    if (existsSync(socketPath)) {
      unlinkSync(socketPath)
    }
  } catch {
    // Ignore cleanup errors
  }
}

export async function startToolhive(): Promise<void> {
  Sentry.withScope<Promise<void>>(async (scope) => {
    if (isUsingCustomSocket()) {
      toolhiveSocketPath = process.env.THV_SOCKET!
      toolhiveMcpPort = parseMcpPortEnv(process.env.THV_MCP_PORT)
      log.info(`Using external ToolHive on socket ${toolhiveSocketPath}`)
      return
    }

    if (!existsSync(binPath)) {
      log.error(`ToolHive binary not found at: ${binPath}`)
      return
    }

    processError = undefined
    toolhiveMcpPort = await findFreePort()
    toolhiveSocketPath = generateSocketPath()
    cleanupSocketFile(toolhiveSocketPath)

    log.info(
      `Starting ToolHive from: ${binPath} on socket ${toolhiveSocketPath}, MCP on port ${toolhiveMcpPort}`
    )

    const serveArgs = [
      'serve',
      '--openapi',
      '--experimental-mcp',
      '--experimental-mcp-host=127.0.0.1',
      `--experimental-mcp-port=${toolhiveMcpPort}`,
      `--socket=${toolhiveSocketPath}`,
    ]

    const isE2E = process.env.TOOLHIVE_E2E === 'true'
    const sentryDsn = isE2E ? undefined : import.meta.env.VITE_SENTRY_THV_DSN
    if (sentryDsn && readSetting('isTelemetryEnabled') !== 'false') {
      const sentryEnvironment = app.isPackaged ? 'production' : 'development'
      serveArgs.push(
        `--sentry-dsn=${sentryDsn}`,
        `--sentry-environment=${sentryEnvironment}`,
        `--sentry-traces-sample-rate=1.0`
      )
    }

    const child = spawn(binPath, serveArgs, {
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: false,
      // Ensure child process is killed when parent exits
      // On Windows, this creates a job object to enforce cleanup
      windowsHide: true,
      env: {
        ...process.env,
        PATH: createEnhancedPath(),
        TOOLHIVE_SKIP_DESKTOP_CHECK: 'true',
      },
    })
    toolhiveProcess = child
    isStopping = false

    log.info(`[startToolhive] Process spawned with PID: ${child.pid}`)

    scope.addBreadcrumb({
      category: 'debug',
      message: `Starting ToolHive from: ${binPath} on socket ${toolhiveSocketPath}, MCP on port ${toolhiveMcpPort}, PID: ${child.pid}`,
    })

    updateTrayStatus(!!child)

    // Capture and log stderr
    if (child.stderr) {
      log.info(`[ToolHive] Capturing stderr enabled`)
      child.stderr.on('data', (data) => {
        const output = data.toString().trim()
        if (!output) return
        if (output.includes('A new version of ToolHive is available')) {
          return
        }
        if (output.includes('registry authentication required')) {
          processError = REGISTRY_AUTH_REQUIRED
        }
        if (output.includes('another ToolHive server is already running')) {
          processError = ALREADY_RUNNING
        }
        log.info(`[ToolHive stderr] ${output}`)
        scope.addBreadcrumb({
          category: 'debug',
          message: `[ToolHive stderr] ${output}`,
          level: 'log',
        })
      })
    }

    child.on('error', (error) => {
      log.error('Failed to start ToolHive: ', error)
      Sentry.captureMessage(
        `Failed to start ToolHive: ${JSON.stringify(error)}`,
        'fatal'
      )
      updateTrayStatus(false)
    })

    child.on('exit', (code) => {
      log.warn(`ToolHive process exited with code: ${code}`)
      // Only clear globals if this exit is for the currently tracked child.
      // Otherwise a prior child's exit can run after restart has spawned a
      // replacement and would wipe the new socket path / process reference.
      if (toolhiveProcess === child) {
        toolhiveProcess = undefined
        toolhiveSocketPath = undefined
        toolhiveMcpPort = undefined
        isStopping = false
      }
      if (!isRestarting && !getQuittingState()) {
        updateTrayStatus(false)
        Sentry.captureMessage(
          `ToolHive process exited with code: ${code}`,
          'fatal'
        )
      }
    })
  })
}

export async function restartToolhive(): Promise<void> {
  if (isRestarting) {
    log.info('Restart already in progress, skipping...')
    return
  }

  isRestarting = true
  log.info('Restarting ToolHive...')

  try {
    // Stop existing process if running
    if (toolhiveProcess && !toolhiveProcess.killed) {
      log.info('Stopping existing ToolHive process...')
      toolhiveProcess.kill()
    }

    // Start new process
    await startToolhive()
    log.info('ToolHive restarted successfully')
  } catch (error) {
    log.error('Failed to restart ToolHive: ', error)
    Sentry.captureMessage(
      `Failed to restart ToolHive: ${JSON.stringify(error)}`,
      'fatal'
    )
  } finally {
    // avoid another restart until process is stabilized
    setTimeout(() => {
      isRestarting = false
    }, 5000)
  }
}

/** Attempt to kill a process, returning true on success */
function tryKillProcess(
  process: ReturnType<typeof spawn>,
  signal: NodeJS.Signals,
  logPrefix: string
): boolean {
  try {
    const result = process.kill(signal)
    log.info(`${logPrefix} ${signal} sent, result: ${result}`)
    return result
  } catch (err) {
    log.error(`${logPrefix} Failed to send ${signal}:`, err)
    return false
  }
}

/** Schedule delayed SIGKILL if process doesn't exit gracefully */
function scheduleForceKill(
  process: ReturnType<typeof spawn>,
  pid: number
): void {
  killTimer = setTimeout(() => {
    killTimer = undefined

    if (!process.killed) {
      log.warn(
        `[stopToolhive] Process ${pid} did not exit gracefully, forcing SIGKILL...`
      )
      tryKillProcess(process, 'SIGKILL', '[stopToolhive]')
    }
  }, 2000)
}

export function stopToolhive(options?: { force?: boolean }): void {
  const force = options?.force ?? false

  // Early return if no process to stop, or a graceful stop is already in
  // flight and the caller isn't asking us to escalate to SIGKILL. The
  // reference must stay alive until the child's 'exit' event fires so the
  // synchronous parent-exit handler can still SIGKILL an orphaned child.
  if (!toolhiveProcess || toolhiveProcess.killed || (isStopping && !force)) {
    log.info(
      `[stopToolhive] No process to stop (process=${!!toolhiveProcess}, killed=${toolhiveProcess?.killed}, isStopping=${isStopping})`
    )
    // Drop stale managed socket path (e.g. after crash) without touching external
    // THV_SOCKET — that path is not owned by this process and must stay visible.
    if (
      (!toolhiveProcess || toolhiveProcess.killed) &&
      !isUsingCustomSocket()
    ) {
      toolhiveSocketPath = undefined
      toolhiveMcpPort = undefined
    }
    return
  }

  // Clear any pending kill timer - we're (re)issuing a kill below.
  if (killTimer) {
    clearTimeout(killTimer)
    killTimer = undefined
  }

  const pidToKill = toolhiveProcess.pid
  const processToKill = toolhiveProcess
  isStopping = true
  log.info(`Stopping ToolHive process (PID: ${pidToKill})...`)

  // Attempt to kill the process
  const signal: NodeJS.Signals = force ? 'SIGKILL' : 'SIGTERM'
  const killed = tryKillProcess(processToKill, signal, '[stopToolhive]')

  // If graceful shutdown failed, try force kill immediately
  if (!killed) {
    tryKillProcess(processToKill, 'SIGKILL', '[stopToolhive]')
    // Child is going away; avoid keeping a socket path that will 404 the API
    // bridge until the real `exit` handler runs (mock tests may not emit exit).
    if (!isUsingCustomSocket()) {
      toolhiveSocketPath = undefined
      toolhiveMcpPort = undefined
    }
    log.info(`[stopToolhive] Process cleanup completed`)
    return
  }

  // For graceful shutdown, schedule delayed force kill
  if (!force && pidToKill !== undefined) {
    scheduleForceKill(processToKill, pidToKill)
  }

  if (toolhiveSocketPath) {
    cleanupSocketFile(toolhiveSocketPath)
  }
  toolhiveSocketPath = undefined
  toolhiveMcpPort = undefined

  log.info(`[stopToolhive] Process cleanup completed`)
}

export { binPath }
