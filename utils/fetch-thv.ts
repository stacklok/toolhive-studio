import { createReadStream } from 'node:fs'
import { mkdir, access, writeFile, chmod, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as tar from 'tar'
import * as unzipper from 'unzipper'
import * as path from 'node:path'
import { spawn } from 'node:child_process'
import { TOOLHIVE_VERSION } from './constants'
import {
  normalizeVersion,
  isCurrentVersionOlder,
} from './parse-release-version'

const execFileAsync = promisify(execFile)

const PLATFORM_MAP: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'windows',
  darwin: 'darwin',
  linux: 'linux',
} as const

const ARCH_MAP: Record<string, string> = {
  x64: 'amd64',
  arm64: 'arm64',
} as const

const GITHUB_API_URL =
  'https://api.github.com/repos/stacklok/toolhive/releases/latest'

async function fetchLatestRelease(): Promise<string | null> {
  try {
    const response = await fetch(GITHUB_API_URL)
    if (!response.ok) return null

    const data = await response.json()
    return data.tag_name ?? null
  } catch {
    return null
  }
}

async function checkBinaryVersion(binPath: string): Promise<boolean> {
  const latestTag = await fetchLatestRelease()

  try {
    await access(binPath)
    if (!latestTag) return false

    const constantThvVersion = normalizeVersion(TOOLHIVE_VERSION)
    const latestVersion = normalizeVersion(latestTag)
    const isVersionOlder = isCurrentVersionOlder(constantThvVersion, latestTag)

    if (isVersionOlder) {
      console.log(
        `A new version of ToolHive is available: ${latestTag} (current: v${constantThvVersion})`
      )
      console.log(
        'Visit https://github.com/stacklok/toolhive/releases/latest for details'
      )
    }

    const shouldDownload = constantThvVersion !== latestVersion
    return shouldDownload
  } catch {
    return true
  }
}

async function cleanBinaryDirectory(binDir: string): Promise<void> {
  try {
    await rm(binDir, { recursive: true, force: true })
  } catch {
    // binary directory does not exist
  }
}

async function downloadAndExtractBinary(
  url: string,
  binDir: string,
  assetName: string
): Promise<void> {
  console.log(`↧ downloading ${assetName} …`)
  await mkdir(binDir, { recursive: true })

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) – ${url}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const archivePath = path.join(binDir, assetName)
  await writeFile(archivePath, buffer)

  const isZip = assetName.endsWith('.zip')
  if (isZip) {
    await createReadStream(archivePath)
      .pipe(unzipper.Extract({ path: binDir }))
      .promise()
  } else {
    await tar.x({ file: archivePath, cwd: binDir })
  }

  // Clean up the archive file after extraction
  try {
    await rm(archivePath)
    console.log(`🗑️  Cleaned up archive: ${assetName}`)
  } catch (error) {
    console.warn(`⚠️  Failed to clean up archive ${assetName}:`, error)
  }
}

async function generateApiClient() {
  console.log('🔄 Regenerating API client...')
  try {
    await execFileAsync('pnpm', ['run', 'generate-client'], {
      cwd: path.resolve(__dirname, '..'),
    })
    console.log('✅ API client regenerated successfully')
  } catch (error) {
    console.warn('⚠️  Failed to regenerate API client:', error)
  }
}

function createBinaryPath(
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture
) {
  const os = PLATFORM_MAP[platform]
  const cpu = ARCH_MAP[arch]

  if (!os || !cpu) {
    throw new Error(
      `Unsupported platform/architecture combination: ${platform}/${arch}`
    )
  }

  const isWindows = os === 'windows'
  const extension = isWindows ? 'zip' : 'tar.gz'

  const tag = TOOLHIVE_VERSION.startsWith('v')
    ? TOOLHIVE_VERSION
    : `v${TOOLHIVE_VERSION}`
  const versionNum = normalizeVersion(TOOLHIVE_VERSION)

  const assetName = `toolhive_${versionNum}_${os}_${cpu}.${extension}`
  const downloadUrl = `https://github.com/stacklok/toolhive/releases/download/${tag}/${assetName}`

  const binDir = path.resolve(__dirname, '..', 'bin', `${platform}-${arch}`)
  const binPath = path.join(binDir, isWindows ? 'thv.exe' : 'thv')

  return { os, binDir, binPath, assetName, downloadUrl }
}

async function signThvBin(binPath: string): Promise<void> {
  console.log('Ad-hoc signing thv binary for macOS...')
  try {
    await execFileAsync('codesign', ['--force', '--sign', '-', binPath])
    console.log('thv binary signed successfully')
  } catch (error) {
    console.warn('Failed to ad-hoc sign binary:', error)
  }
}

export async function ensureThv(
  platform: NodeJS.Platform = process.platform,
  arch: NodeJS.Architecture = process.arch
): Promise<string> {
  const { binDir, binPath, assetName, downloadUrl } = createBinaryPath(
    platform,
    arch
  )

  const shouldDownload = await checkBinaryVersion(binPath)
  if (!shouldDownload) return binPath

  await cleanBinaryDirectory(binDir)
  await downloadAndExtractBinary(downloadUrl, binDir, assetName)
  await chmod(binPath, 0o755)

  // Ad-hoc sign the binary for macOS. Required because Xcode 26.2+ refuses to
  // sign app bundles containing unsigned binaries, which breaks notarization.
  if (platform === 'darwin') {
    await signThvBin(binPath)
  }

  await generateApiClient()

  return binPath
}

if (require.main === module) {
  ;(async () => {
    const args = process.argv.slice(2)
    const runIdx = args.indexOf('--run')
    const shouldRun = runIdx !== -1
    if (shouldRun) args.splice(runIdx, 1)

    const thvPath = await ensureThv()

    if (shouldRun) {
      const child = spawn(thvPath, args, { stdio: 'inherit' })
      child.on('exit', (code) => process.exit(code ?? 0))
    } else {
      console.log(thvPath)
    }
  })().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
