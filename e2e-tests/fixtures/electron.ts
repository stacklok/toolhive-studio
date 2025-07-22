import {
  test as base,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import net from 'node:net'

// ToolHive binary path (simplified for test environment)
const binName = process.platform === 'win32' ? 'thv.exe' : 'thv'
const binPath = path.resolve(
  __dirname,
  '..',
  '..',
  'bin',
  `${process.platform}-${process.arch}`,
  binName
)

let testToolhiveProcess: ReturnType<typeof spawn> | undefined
let testToolhivePort: number | undefined

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

async function startTestToolhive(): Promise<number> {
  if (!existsSync(binPath)) {
    throw new Error(`ToolHive binary not found at: ${binPath}`)
  }

  testToolhivePort = await findFreePort()
  console.log(`Starting test ToolHive from: ${binPath} on port ${testToolhivePort}`)

  testToolhiveProcess = spawn(
    binPath,
    ['serve', '--openapi', '--host=127.0.0.1', `--port=${testToolhivePort}`],
    {
      stdio: 'ignore',
      detached: false,
    }
  )

  console.log(`Test ToolHive process spawned with PID: ${testToolhiveProcess.pid}`)

  // Wait a bit for the server to start
  await new Promise(resolve => setTimeout(resolve, 2000))

  return testToolhivePort
}

async function stopTestToolhive(): Promise<void> {
  if (testToolhiveProcess && !testToolhiveProcess.killed) {
    console.log('Stopping test ToolHive process...')
    testToolhiveProcess.kill()
    testToolhiveProcess = undefined
    testToolhivePort = undefined
  }
}

async function removeAllThvItems(port: number): Promise<void> {
  try {
    console.log('Fetching list of workloads via API...')
    
    // Get all workloads
    const response = await fetch(`http://localhost:${port}/api/v1beta/workloads`)
    if (!response.ok) {
      throw new Error(`Failed to fetch workloads: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    const workloads = data.workloads || []
    
    console.log({ workloads })

    if (workloads.length === 0) {
      console.log('No workloads found to remove.')
      return
    }

    const names: string[] = workloads.map((workload: any) => workload.name).filter(Boolean)
    const runningWorkloads = workloads.filter((workload: any) => workload.status === 'running')

    console.log(`Found ${names.length} workloads to remove:`, names)
    console.log(`Found ${runningWorkloads.length} running workloads to stop first`)

    // First, stop all running workloads
    const stopPromises = runningWorkloads.map(async (workload) => {
      try {
        console.log(`Stopping: ${workload.name}`)
        const stopResponse = await fetch(`http://localhost:${port}/api/v1beta/workloads/${workload.name}/stop`, {
          method: 'POST',
        })
        
        if (!stopResponse.ok) {
          throw new Error(`Failed to stop ${workload.name}: ${stopResponse.status} ${stopResponse.statusText}`)
        }
        
        console.log(`✓ Successfully stopped: ${workload.name}`)
      } catch (error) {
        console.error(`✗ Failed to stop ${workload.name}:`, error)
      }
    })

    await Promise.all(stopPromises)
    console.log('All running workloads stopped.')

    // Wait a bit for workloads to fully stop
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Then remove each workload in parallel
    const removePromises = names.map(async (name) => {
      try {
        console.log(`Removing: ${name}`)
        const deleteResponse = await fetch(`http://localhost:${port}/api/v1beta/workloads/${name}`, {
          method: 'DELETE',
        })
        
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete ${name}: ${deleteResponse.status} ${deleteResponse.statusText}`)
        }
        
        console.log(`✓ Successfully removed: ${name}`)
      } catch (error) {
        console.error(`✗ Failed to remove ${name}:`, error)
      }
    })

    await Promise.all(removePromises)
    console.log('Batch removal completed.')

  } catch (error) {
    console.error('Error during batch removal:', error)
    // Don't throw error to prevent test failures due to cleanup issues
    // Just log and continue
  }
}

type ElectronFixtures = {
  electronApp: ElectronApplication
  window: Page
}

export const test = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({ }, use) => {
    // Start a test ToolHive server
    const port = await startTestToolhive()

    // Clean up THV items before each test
    await removeAllThvItems(port)
    await stopTestToolhive()

    const app = await electron.launch({
      args: ['.'],
      recordVideo: { dir: 'test-videos' },
    })
    await use(app)
    // Ensure app is closed and video is recorded
    const appToClose = app.close()
    await appToClose
    

  },
  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()
    await use(window)
  },
})

export { expect } from '@playwright/test'
