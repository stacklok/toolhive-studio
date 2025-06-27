import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { app } from 'electron'
import type { Tray } from 'electron'
import { updateTrayStatus } from './system-tray'

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
  return !!toolhiveProcess && !toolhiveProcess.killed
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
  if (!existsSync(binPath)) {
    console.error(`ToolHive binary not found at: ${binPath}`)
    return
  }

  toolhivePort = await findFreePort()
  console.log(`Starting ToolHive from: ${binPath} on port ${toolhivePort}`)

  toolhiveProcess = spawn(
    binPath,
    ['serve', '--openapi', '--host=127.0.0.1', `--port=${toolhivePort}`],
    {
      stdio: 'ignore',
      detached: false,
    }
  )

  if (tray) {
    updateTrayStatus(tray, !!toolhiveProcess)
  }

  toolhiveProcess.on('error', (error) => {
    console.error('Failed to start ToolHive:', error)
    if (tray) updateTrayStatus(tray, false)
  })

  toolhiveProcess.on('exit', (code) => {
    console.log(`ToolHive process exited with code: ${code}`)
    toolhiveProcess = undefined
    if (tray) updateTrayStatus(tray, false)
  })
}

export async function restartToolhive(tray?: Tray): Promise<void> {
  if (isRestarting) {
    console.log('Restart already in progress, skipping...')
    return
  }

  isRestarting = true
  console.log('Restarting ToolHive...')

  try {
    // Stop existing process if running
    if (toolhiveProcess && !toolhiveProcess.killed) {
      console.log('Stopping existing ToolHive process...')
      toolhiveProcess.kill()
    }

    // Start new process
    await startToolhive(tray)
    console.log('ToolHive restarted successfully')
  } finally {
    // avoid another restart until process is stabilized
    setTimeout(() => {
      isRestarting = false
    }, 5000)
  }
}

export function stopToolhive(): void {
  if (toolhiveProcess && !toolhiveProcess.killed) {
    console.log('Stopping ToolHive process...')
    toolhiveProcess.kill()
    toolhiveProcess = undefined
  }
}

export { binPath }
