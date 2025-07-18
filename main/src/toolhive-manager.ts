import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import * as net from 'node:net'
import { app } from 'electron'
import type { Tray } from 'electron'
import { updateTrayStatus } from './system-tray'
import log from './logger'
import * as Sentry from '@sentry/electron/main'

// Use CommonJS require for testcontainers to avoid esModuleInterop issues
const { GenericContainer } = require('testcontainers')
type StartedTestContainer = any // We'll use any for now since the type is complex

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
let toolhiveContainer: StartedTestContainer | undefined
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

export async function startToolhive(
  tray?: Tray,
  isEphemeral = false
): Promise<void> {
  log.info(
    `[startToolhive] Starting (ephemeral=${isEphemeral}) – ` +
      `Current state: isRunning=${isToolhiveRunning()}, isRestarting=${isRestarting}`
  )

  if (!existsSync(binPath)) {
    log.error(`ToolHive binary not found at: ${binPath}`)
    return
  }

  toolhivePort = await findFreePort()

  // ──────────────────────────────
  // Choice 1: Ephemeral container
  // ──────────────────────────────
  if (isEphemeral) {
    try {
      log.info(
        `[startToolhive] Launching ToolHive inside container on host port ${toolhivePort}`
      )

      toolhiveContainer = await new GenericContainer('alpine:3.20')
        .withCopyFilesToContainer([
          {
            source: binPath,
            target: '/usr/local/bin/toolhive',
            mode: 0o755,
          },
        ])
        .withExposedPorts(8080)
        .withCommand([
          '/usr/local/bin/toolhive',
          'serve',
          '--openapi',
          '--host=0.0.0.0',
          '--port=8080',
        ])
        .withAutoRemove(false) // keep logs around for debugging
        .start()

      const mappedPort = toolhiveContainer.getMappedPort(8080)

      log.info(
        `[startToolhive] Container started. PID=N/A, mappedPort=${mappedPort}`
      )

      if (tray) updateTrayStatus(tray, true)

      /* Optional: stream container logs to our logger */
      toolhiveContainer.logs().then((stream: any) => {
        stream
          .on('data', (line: string) => log.debug(`[ToolHive ⍟] ${line}`))
          .on('err', (line: string) => log.error(`[ToolHive ⍟] ${line}`))
      })

      /* Handle container exit so we can reflect it in UI */
      // Note: testcontainers doesn't provide waitForExit, so we'll handle this differently
      // We can monitor the container status or use the logs to detect when it stops
      toolhiveContainer.logs().then((stream: any) => {
        stream.on('end', () => {
          log.warn(`[startToolhive] Container logs ended`)
          toolhiveContainer = undefined
          if (tray) updateTrayStatus(tray, false)
        })
      })

      return // Nothing else to do in container mode
    } catch (err) {
      log.error('[startToolhive] Failed to start container', err)
      Sentry.captureException(err)
      if (tray) updateTrayStatus(tray, false)
      return
    }
  }

  // ──────────────────────────────
  // Choice 2: Local process (original behaviour)
  // ──────────────────────────────
  log.info(`Starting ToolHive from: ${binPath} on port ${toolhivePort}`)

  toolhiveProcess = spawn(
    binPath,
    ['serve', '--openapi', '--host=127.0.0.1', `--port=${toolhivePort}`],
    { stdio: 'ignore', detached: false }
  )

  log.info(`[startToolhive] Process spawned with PID: ${toolhiveProcess.pid}`)

  if (tray) updateTrayStatus(tray, true)

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
