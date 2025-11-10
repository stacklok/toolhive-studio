import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { app } from 'electron'
import { updateTrayStatus } from './system-tray'
import log from './logger'
import * as Sentry from '@sentry/electron/main'
import { getQuittingState } from './app-state'

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
let toolhivePort: number | undefined
let toolhiveMcpPort: number | undefined
let isRestarting = false
let killTimer: NodeJS.Timeout | undefined

export function getToolhivePort(): number | undefined {
  return toolhivePort
}

export function getToolhiveMcpPort(): number | undefined {
  return toolhiveMcpPort
}

export function isToolhiveRunning(): boolean {
  const isRunning = !!toolhiveProcess && !toolhiveProcess.killed
  return isRunning
}

/**
 * Returns whether the app is using a custom ToolHive port (externally managed thv).
 */
export function isUsingCustomPort(): boolean {
  return !app.isPackaged && !!process.env.THV_PORT
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

export async function startToolhive(): Promise<void> {
  Sentry.withScope<Promise<void>>(async (scope) => {
    if (isUsingCustomPort()) {
      const customPort = parseInt(process.env.THV_PORT!, 10)
      if (isNaN(customPort)) {
        log.error(
          `Invalid THV_PORT environment variable: ${process.env.THV_PORT}`
        )
        return
      }
      toolhivePort = customPort
      toolhiveMcpPort = process.env.THV_MCP_PORT
        ? parseInt(process.env.THV_MCP_PORT!, 10)
        : undefined
      log.info(`Using external ToolHive on port ${toolhivePort}`)
      return
    }

    if (!existsSync(binPath)) {
      log.error(`ToolHive binary not found at: ${binPath}`)
      return
    }

    toolhiveMcpPort = await findFreePort()
    toolhivePort = await findFreePort(50000, 50100)
    log.info(
      `Starting ToolHive from: ${binPath} on port ${toolhivePort}, MCP on port ${toolhiveMcpPort}`
    )

    toolhiveProcess = spawn(
      binPath,
      [
        'serve',
        '--openapi',
        '--experimental-mcp',
        '--experimental-mcp-host=127.0.0.1',
        `--experimental-mcp-port=${toolhiveMcpPort}`,
        '--host=127.0.0.1',
        `--port=${toolhivePort}`,
      ],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
        detached: false,
        // Ensure child process is killed when parent exits
        // On Windows, this creates a job object to enforce cleanup
        windowsHide: true,
      }
    )
    log.info(`[startToolhive] Process spawned with PID: ${toolhiveProcess.pid}`)

    scope.addBreadcrumb({
      category: 'debug',
      message: `Starting ToolHive from: ${binPath} on port ${toolhivePort}, MCP on port ${toolhiveMcpPort}, PID: ${toolhiveProcess.pid}`,
    })

    updateTrayStatus(!!toolhiveProcess)

    // Capture and log stderr
    if (toolhiveProcess.stderr) {
      log.info(`[ToolHive] Capturing stderr enabled`)
      toolhiveProcess.stderr.on('data', (data) => {
        const output = data.toString().trim()
        if (!output) return
        if (output.includes('A new version of ToolHive is available')) {
          return
        }
        log.info(`[ToolHive stderr] ${output}`)
        scope.addBreadcrumb({
          category: 'debug',
          message: `[ToolHive stderr] ${output}`,
          level: 'log',
        })
      })
    }

    toolhiveProcess.on('error', (error) => {
      log.error('Failed to start ToolHive: ', error)
      Sentry.captureMessage(
        `Failed to start ToolHive: ${JSON.stringify(error)}`,
        'fatal'
      )
      updateTrayStatus(false)
    })

    toolhiveProcess.on('exit', (code) => {
      log.warn(`ToolHive process exited with code: ${code}`)
      toolhiveProcess = undefined
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

  // Clear any pending kill timer
  if (killTimer) {
    clearTimeout(killTimer)
    killTimer = undefined
  }

  // Early return if no process to stop
  if (!toolhiveProcess || toolhiveProcess.killed) {
    log.info(
      `[stopToolhive] No process to stop (process=${!!toolhiveProcess}, killed=${toolhiveProcess?.killed})`
    )
    return
  }

  const pidToKill = toolhiveProcess.pid
  log.info(`Stopping ToolHive process (PID: ${pidToKill})...`)

  // Capture process reference before clearing global
  const processToKill = toolhiveProcess
  toolhiveProcess = undefined

  // Attempt to kill the process
  const signal: NodeJS.Signals = force ? 'SIGKILL' : 'SIGTERM'
  const killed = tryKillProcess(processToKill, signal, '[stopToolhive]')

  // If graceful shutdown failed, try force kill immediately
  if (!killed) {
    tryKillProcess(processToKill, 'SIGKILL', '[stopToolhive]')
    log.info(`[stopToolhive] Process cleanup completed`)
    return
  }

  // For graceful shutdown, schedule delayed force kill
  if (!force && pidToKill !== undefined) {
    scheduleForceKill(processToKill, pidToKill)
  }

  log.info(`[stopToolhive] Process cleanup completed`)
}

export { binPath }
