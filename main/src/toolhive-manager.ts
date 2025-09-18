import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { app } from 'electron'
import type { Tray } from 'electron'
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

export function getToolhivePort(): number | undefined {
  return toolhivePort
}

export function getToolhiveMcpPort(): number | undefined {
  return toolhiveMcpPort
}

export function isToolhiveRunning(): boolean {
  const isRunning = !!toolhiveProcess && !toolhiveProcess.killed
  log.debug(
    `[isToolhiveRunning] Process exists: ${!!toolhiveProcess}, Killed: ${toolhiveProcess?.killed}, Port: ${toolhivePort}, Result: ${isRunning}`
  )
  return isRunning
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

export async function startToolhive(tray?: Tray): Promise<void> {
  Sentry.withScope(async (scope) => {
    if (!existsSync(binPath)) {
      log.error(`ToolHive binary not found at: ${binPath}`)
      return
    }

    toolhivePort = await findFreePort(50000, 50100)
    toolhiveMcpPort = await findFreePort()
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
      }
    )

    log.info(`[startToolhive] Process spawned with PID: ${toolhiveProcess.pid}`)

    scope.addBreadcrumb({
      category: 'debug',
      message: `Starting ToolHive from: ${binPath} on port ${toolhivePort}, MCP on port ${toolhiveMcpPort}, PID: ${toolhiveProcess.pid}`,
    })

    if (tray) {
      updateTrayStatus(tray, !!toolhiveProcess)
    }

    // Capture and log stderr
    if (toolhiveProcess.stderr) {
      log.info(`[ToolHive] Capturing stderr enabled`)
      toolhiveProcess.stderr.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          scope.addBreadcrumb({
            category: 'debug',
            message: `[ToolHive stderr] ${output}`,
            level: 'log',
          })
        }
      })
    }

    toolhiveProcess.on('error', (error) => {
      log.error('Failed to start ToolHive: ', error)
      Sentry.captureMessage(
        `Failed to start ToolHive: ${JSON.stringify(error)}`,
        'fatal'
      )
      if (tray) updateTrayStatus(tray, false)
    })

    toolhiveProcess.on('exit', (code) => {
      log.warn(`ToolHive process exited with code: ${code}`)
      toolhiveProcess = undefined
      if (tray) updateTrayStatus(tray, false)
      if (!isRestarting && !getQuittingState()) {
        Sentry.captureMessage(
          `ToolHive process exited with code: ${code}`,
          'fatal'
        )
      }
    })
  })
}

export async function restartToolhive(tray?: Tray): Promise<void> {
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
    await startToolhive(tray)
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

export function stopToolhive(): void {
  if (toolhiveProcess && !toolhiveProcess.killed) {
    log.info('Stopping ToolHive process...')
    toolhiveProcess.kill()
    toolhiveProcess = undefined
    log.info(`[stopToolhive] Process stopped and reset`)
  } else {
    log.info(`[stopToolhive] No process to stop`)
  }
}

export { binPath }
