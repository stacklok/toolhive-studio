import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { app } from 'electron'
import type { Tray } from 'electron'
import { updateTrayStatus } from './system-tray'
import log from './logger'
import * as Sentry from '@sentry/electron/main'

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
let isRestarting = false

export function getToolhivePort(): number | undefined {
  return toolhivePort
}

export function isToolhiveRunning(): boolean {
  const isRunning = !!toolhiveProcess && !toolhiveProcess.killed
  log.debug(
    `[isToolhiveRunning] Process exists: ${!!toolhiveProcess}, Killed: ${toolhiveProcess?.killed}, Port: ${toolhivePort}, Result: ${isRunning}`
  )
  return isRunning
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const address = server.address()
      if (typeof address === 'object' && address && address.port) {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        reject(new Error('Failed to get port'))
      }
    })
    server.on('error', reject)
  })
}

export async function startToolhive(tray?: Tray): Promise<void> {
  log.info(
    `[startToolhive] Starting - Current state: isRunning=${isToolhiveRunning()}, isRestarting=${isRestarting}`
  )

  if (!existsSync(binPath)) {
    log.error(`ToolHive binary not found at: ${binPath}`)
    return
  }

  toolhivePort = await findFreePort()
  log.info(`Starting ToolHive from: ${binPath} on port ${toolhivePort}`)

  toolhiveProcess = spawn(
    binPath,
    ['serve', '--openapi', '--host=127.0.0.1', `--port=${toolhivePort}`],
    {
      stdio: 'ignore',
      detached: false,
    }
  )

  log.info(`[startToolhive] Process spawned with PID: ${toolhiveProcess.pid}`)

  if (tray) {
    updateTrayStatus(tray, !!toolhiveProcess)
  }

  toolhiveProcess.on('error', (error) => {
    log.error('Failed to start ToolHive: ', error)
    Sentry.captureMessage(
      `Failed to start ToolHive: ${JSON.stringify(error)}`,
      'error'
    )
    if (tray) updateTrayStatus(tray, false)
  })

  toolhiveProcess.on('exit', (code) => {
    log.warn(`ToolHive process exited with code: ${code}`)
    toolhiveProcess = undefined
    if (tray) updateTrayStatus(tray, false)
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
      'error'
    )
  } finally {
    // avoid another restart until process is stabilized
    setTimeout(() => {
      isRestarting = false
    }, 5000)
  }
}

export function stopToolhive(): void {
  log.info(
    `[stopToolhive] Current state: isRunning=${isToolhiveRunning()}, PID: ${toolhiveProcess?.pid}`
  )
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
