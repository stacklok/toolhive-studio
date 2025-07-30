import 'dotenv/config'
import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerFlatpak } from '@electron-forge/maker-flatpak'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { ensureThv } from './utils/fetch-thv'
import MakerTarGz from './utils/forge-makers/MakerTarGz'
import MakerDMGWithArch from './utils/forge-makers/MakerDMGWithArch'

function isValidPlatform(platform: string): platform is NodeJS.Platform {
  return ['win32', 'darwin', 'linux'].includes(platform)
}

function isValidArchitecture(arch: string): arch is NodeJS.Architecture {
  return ['x64', 'arm64'].includes(arch)
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './icons/icon',
    executableName: 'ToolHive',
    /**
     * Everything under bin/ is copied into
     * <app>/Contents/Resources/bin/ (macOS)
     * <app>/resources/bin/       (Win/Linux)
     */
    extraResource: ['bin/', 'icons/', 'assets/'],
    // Windows specific options
    win32metadata: {
      CompanyName: 'Stacklok',
      FileDescription: 'ToolHive',
      OriginalFilename: 'ToolHive.exe',
      ProductName: 'ToolHive',
      InternalName: 'ToolHive',
    },

    // MacOS Code Signing Configuration
    osxSign: process.env.MAC_DEVELOPER_IDENTITY
      ? { identity: process.env.MAC_DEVELOPER_IDENTITY }
      : {}, // Auto-detect certificates

    // MacOS Notarization Configuration
    osxNotarize: (() => {
      // Prefer Apple API Key method
      if (process.env.APPLE_API_KEY) {
        return {
          appleApiKey: process.env.APPLE_API_KEY,
          appleApiIssuer: process.env.APPLE_ISSUER_ID!,
          appleApiKeyId: process.env.APPLE_KEY_ID!,
        }
      }

      // Fallback to Apple ID method
      if (process.env.APPLE_ID) {
        return {
          teamId: process.env.TEAM_ID!,
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_ID_PASSWORD!,
        }
      }

      return undefined
    })(),
  },

  rebuildConfig: {},

  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'stacklok',
          name: 'toolhive-studio',
        },
        draft: false,
        prerelease: false,
      },
    },
  ],

  makers: [
    new MakerSquirrel({
      // Windows Squirrel installer configuration
      setupIcon: './icons/icon.ico', // Setup.exe icon
      setupExe: 'ToolHive Setup.exe',
      noMsi: true, // Don't create MSI installer
      authors: 'Stacklok',
      exe: 'ToolHive.exe',
      name: 'ToolHive',
    }),
    new MakerDMGWithArch(
      {
        name: 'ToolHive',
        title: 'ToolHive',
        icon: './icons/icon.icns',
        overwrite: true,
        background: './assets/dmg-installer-background.png',
        additionalDMGOptions: {
          window: {
            size: {
              width: 658,
              height: 498,
            },
          },
        },
      },
      ['darwin']
    ),
    new MakerZIP({}, ['darwin', 'win32']),
    new MakerTarGz({}, ['linux']),
    new MakerRpm({
      options: {
        name: 'ToolHive',
        productName: 'ToolHive',
        genericName: 'ToolHive',
        icon: './icons/icon.png',
        requires: ['docker >= 20.10'],
        license: 'Apache-2.0',
        bin: 'ToolHive',
      },
    }),
    new MakerDeb({
      options: {
        name: 'ToolHive',
        productName: 'ToolHive',
        genericName: 'ToolHive',
        icon: './icons/icon.png',
        depends: [],
        maintainer: 'Stacklok',
        homepage: 'https://github.com/stacklok/toolhive-studio',
        section: 'devel',
        bin: 'ToolHive',
      },
    }),
    // Requirements: install elfutils package and add Flathub remote
    // Run: flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    new MakerFlatpak({
      options: {
        categories: ['Development', 'Utility'],
        id: 'io.github.stacklok.toolhive_studio',
        bin: 'ToolHive',
        finishArgs: [
          '--share=network',
          '--socket=x11',
          '--socket=wayland',
          '--device=dri',
          '--socket=system-bus',
          '--socket=session-bus',
          '--filesystem=/run/docker.sock',
          '--filesystem=/run/podman/podman.sock',
        ],
        icon: './icons/icon.png',
        files: [],
      },
    }),
  ],

  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'main/src/main.ts',
          config: 'main/vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'preload/src/preload.ts',
          config: 'preload/vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'renderer/vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],

  /**
   * Hooks are the glue that let us pull ToolHive ("thv")
   * right before dev-server start or a production build.
   */
  hooks: {
    generateAssets: async (_forgeConfig, platform, arch) => {
      if (!isValidPlatform(platform)) {
        throw new Error(`Unsupported platform: ${platform}`)
      }
      if (!isValidArchitecture(arch)) {
        throw new Error(`Unsupported architecture: ${arch}`)
      }

      // Download/cached the exact binary needed for this build target
      await ensureThv(platform, arch)
    },
  },
}

export default config
