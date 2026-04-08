import path from 'node:path'
import { promises as fs } from 'node:fs'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { MakerBase, type MakerOptions } from '@electron-forge/maker-base'
import type { ForgePlatform } from '@electron-forge/shared-types'
import { ensureThv } from '../fetch-thv'
import {
  flatpakFilesystemEntries,
  parseThvClients,
} from '../flatpak-client-paths'
import {
  EXECUTABLE_NAME,
  FLATPAK_APP_ID as APP_ID,
  FLATPAK_MODULE_DIR,
  FLATPAK_WRAPPER_NAME,
} from '../../common/app-info'

const execFileAsync = promisify(execFile)
const RUNTIME_VERSION = '24.08'

function runCommand(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: 'inherit' })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}

/**
 * Custom Electron Forge maker that produces a Flatpak bundle using
 * flatpak-builder with a proper manifest (Electron2 BaseApp + zypak).
 *
 * Replaces @electron-forge/maker-flatpak which uses the unmaintained
 * @malept/flatpak-bundler and produces outdated bundles.
 *
 * The metadata files (desktop, metainfo, wrapper) live in flatpak/ at the
 * project root and are reusable for a future Flathub submission.
 */
export default class MakerFlatpakBuilder extends MakerBase<
  Record<string, never>
> {
  name = 'flatpak-builder'

  defaultPlatforms: ForgePlatform[] = ['linux']

  isSupportedOnCurrentPlatform(): boolean {
    return process.platform === 'linux'
  }

  async make({ dir, makeDir, targetArch }: MakerOptions): Promise<string[]> {
    const archMap: Record<string, string> = { x64: 'x86_64', arm64: 'aarch64' }
    const flatpakArch = archMap[targetArch]
    if (!flatpakArch) {
      throw new Error(
        `Unsupported architecture for Flatpak build: ${targetArch}`
      )
    }

    // Resolve the thv binary for this arch (already downloaded by generateAssets)
    // and derive finish-args from the exact client list this version of thv reports.
    // This ensures the manifest reflects what the current binary supports — stale
    // mapping entries are excluded, and any unmapped new client fails the build.
    const thvPath = await ensureThv('linux', targetArch as NodeJS.Architecture)
    const { stdout, stderr } = await execFileAsync(thvPath, [
      'client',
      'register',
      '--help',
    ]).catch((err: { stdout?: string; stderr?: string }) => ({
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
    }))

    const clients = parseThvClients(`${stdout}\n${stderr}`)
    if (clients.length === 0) {
      throw new Error(
        'Failed to parse any clients from `thv client register --help`. ' +
          'Cannot generate Flatpak filesystem permissions.'
      )
    }

    // Throws with a clear message if any client is missing from CLIENT_FLATPAK_PATHS
    const clientFilesystemEntries = flatpakFilesystemEntries(clients)

    const fileName = `${APP_ID}_${flatpakArch}.flatpak`
    const outDir = path.join(makeDir, flatpakArch)
    const outPath = path.join(outDir, fileName)

    await this.ensureFile(outPath)

    // Use a temp dir on the same filesystem as the project so
    // flatpak-builder can hardlink its state/cache directories.
    const tmpDir = await fs.mkdtemp(path.join(outDir, '.flatpak-work-'))
    const buildDir = path.join(tmpDir, 'build')
    const repoDir = path.join(tmpDir, 'repo')

    try {
      const projectRoot = process.cwd()
      const flatpakDir = path.join(projectRoot, 'flatpak')
      const iconPath = path.join(projectRoot, 'icons', 'icon.png')

      // Generate the flatpak-builder manifest (JSON format)
      const manifest = this.generateManifest(
        dir,
        flatpakDir,
        iconPath,
        clientFilesystemEntries
      )
      const manifestPath = path.join(tmpDir, `${APP_ID}.json`)
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

      // Build with flatpak-builder
      await runCommand('flatpak-builder', [
        '--user',
        '--force-clean',
        `--arch=${flatpakArch}`,
        '--install-deps-from=flathub',
        `--repo=${repoDir}`,
        buildDir,
        manifestPath,
      ])

      // Export as a distributable bundle
      await runCommand('flatpak', [
        'build-bundle',
        repoDir,
        outPath,
        APP_ID,
        `--arch=${flatpakArch}`,
      ])

      return [outPath]
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  }

  private generateManifest(
    appDir: string,
    flatpakDir: string,
    iconPath: string,
    clientFilesystemEntries: string[]
  ) {
    return {
      id: APP_ID,
      base: 'org.electronjs.Electron2.BaseApp',
      'base-version': RUNTIME_VERSION,
      runtime: 'org.freedesktop.Platform',
      'runtime-version': RUNTIME_VERSION,
      sdk: 'org.freedesktop.Sdk',
      command: FLATPAK_WRAPPER_NAME,
      'separate-locales': false,
      'finish-args': [
        '--share=ipc',
        '--share=network',
        '--socket=x11',
        '--socket=wayland',
        '--device=dri',
        // TODO: Narrow D-Bus permissions to specific --talk-name= entries before Flathub submission.
        // Full bus access will be rejected by Flathub reviewers.
        '--socket=system-bus',
        '--socket=session-bus',
        // Docker/Podman socket access is required for the app's core functionality:
        // ToolHive manages MCP servers running as containers.
        '--filesystem=/run/docker.sock',
        '--filesystem=/run/podman/podman.sock',
        '--filesystem=xdg-run/podman/podman.sock',
        // CLI alignment: wrapper script + marker file
        '--filesystem=~/.toolhive:create',
        // CLI alignment: PATH entries in shell RC files
        '--filesystem=~/.bashrc',
        '--filesystem=~/.bash_profile',
        '--filesystem=~/.profile',
        '--filesystem=~/.zshrc',
        '--filesystem=~/.config/fish:create',
        '--env=ELECTRON_TRASH=gio',
        '--env=TOOLHIVE_SKIP_DESKTOP_CHECK=1',
        // MCP client config directories — derived at build time from the live
        // `thv client register --help` output. Validated against CLIENT_FLATPAK_PATHS:
        // any client not in the map fails the build before this line is reached.
        ...clientFilesystemEntries,
      ],
      modules: [
        {
          name: FLATPAK_MODULE_DIR,
          buildsystem: 'simple',
          'build-commands': [
            `mkdir -p \${FLATPAK_DEST}/${FLATPAK_MODULE_DIR}`,
            `cp -a toolhive-app/. \${FLATPAK_DEST}/${FLATPAK_MODULE_DIR}/`,
            `chmod +x \${FLATPAK_DEST}/${FLATPAK_MODULE_DIR}/${EXECUTABLE_NAME}`,
            `install -Dm755 ${FLATPAK_WRAPPER_NAME}.sh \${FLATPAK_DEST}/bin/${FLATPAK_WRAPPER_NAME}`,
            `install -Dm644 ${APP_ID}.desktop \${FLATPAK_DEST}/share/applications/\${FLATPAK_ID}.desktop`,
            `install -Dm644 ${APP_ID}.metainfo.xml \${FLATPAK_DEST}/share/metainfo/\${FLATPAK_ID}.metainfo.xml`,
            'install -Dm644 icon.png ${FLATPAK_DEST}/share/icons/hicolor/256x256/apps/${FLATPAK_ID}.png',
            `patch-desktop-filename \${FLATPAK_DEST}/${FLATPAK_MODULE_DIR}/resources/app.asar`,
          ],
          sources: [
            { type: 'dir', path: appDir, dest: 'toolhive-app' },
            {
              type: 'file',
              path: path.join(flatpakDir, `${FLATPAK_WRAPPER_NAME}.sh`),
            },
            {
              type: 'file',
              path: path.join(flatpakDir, `${APP_ID}.desktop`),
            },
            {
              type: 'file',
              path: path.join(flatpakDir, `${APP_ID}.metainfo.xml`),
            },
            { type: 'file', path: iconPath, 'dest-filename': 'icon.png' },
          ],
        },
      ],
    }
  }

  public async ensureFile(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    try {
      await fs.unlink(filePath)
    } catch {
      /* ignore if file didn't exist */
    }
  }
}
