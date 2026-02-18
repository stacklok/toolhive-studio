import path from 'node:path'
import { promises as fs } from 'node:fs'
import { spawn } from 'node:child_process'
import { MakerBase, type MakerOptions } from '@electron-forge/maker-base'
import type { ForgePlatform } from '@electron-forge/shared-types'

const APP_ID = 'com.stacklok.ToolHive'
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
    const flatpakArch = targetArch === 'x64' ? 'x86_64' : 'aarch64'
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
      const manifest = this.generateManifest(dir, flatpakDir, iconPath)
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
    iconPath: string
  ) {
    return {
      id: APP_ID,
      base: 'org.electronjs.Electron2.BaseApp',
      'base-version': RUNTIME_VERSION,
      runtime: 'org.freedesktop.Platform',
      'runtime-version': RUNTIME_VERSION,
      sdk: 'org.freedesktop.Sdk',
      command: 'toolhive-wrapper',
      'separate-locales': false,
      'finish-args': [
        '--share=ipc',
        '--share=network',
        '--socket=x11',
        '--socket=wayland',
        '--device=dri',
        '--socket=system-bus',
        '--socket=session-bus',
        '--filesystem=/run/docker.sock',
        '--filesystem=/run/podman/podman.sock',
        '--filesystem=xdg-run/podman/podman.sock',
        '--env=ELECTRON_TRASH=gio',
      ],
      modules: [
        {
          name: 'toolhive',
          buildsystem: 'simple',
          'build-commands': [
            'mkdir -p ${FLATPAK_DEST}/toolhive',
            'cp -a toolhive-app/. ${FLATPAK_DEST}/toolhive/',
            'chmod +x ${FLATPAK_DEST}/toolhive/ToolHive',
            'install -Dm755 toolhive-wrapper.sh ${FLATPAK_DEST}/bin/toolhive-wrapper',
            `install -Dm644 ${APP_ID}.desktop \${FLATPAK_DEST}/share/applications/\${FLATPAK_ID}.desktop`,
            `install -Dm644 ${APP_ID}.metainfo.xml \${FLATPAK_DEST}/share/metainfo/\${FLATPAK_ID}.metainfo.xml`,
            'install -Dm644 icon.png ${FLATPAK_DEST}/share/icons/hicolor/256x256/apps/${FLATPAK_ID}.png',
            'patch-desktop-filename ${FLATPAK_DEST}/toolhive/resources/app.asar',
          ],
          sources: [
            { type: 'dir', path: appDir, dest: 'toolhive-app' },
            {
              type: 'file',
              path: path.join(flatpakDir, 'toolhive-wrapper.sh'),
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
