import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerRpm } from '@electron-forge/maker-rpm'
// import { MakerFlatpak } from "@electron-forge/maker-flatpak";
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { ensureThv } from './utils/fetch-thv'
import MakerTarGz from './utils/forge-makers/MakerTarGz'

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
    /**
     * Everything under bin/ is copied into
     * <app>/Contents/Resources/bin/ (macOS)
     * <app>/resources/bin/       (Win/Linux)
     */
    extraResource: ['bin/', 'icons/'],
    // Windows specific options
    win32metadata: {
      CompanyName: 'Stacklok Labs',
      FileDescription: 'ToolHive Studio',
      OriginalFilename: 'ToolHive Studio.exe',
      ProductName: 'ToolHive Studio',
      InternalName: 'ToolHive Studio',
    },
  },

  rebuildConfig: {},

  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'StacklokLabs',
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
      setupExe: 'ToolHive Studio Setup.exe',
      noMsi: true, // Don't create MSI installer
      authors: 'Stacklok Labs',
      description: 'ToolHive Studio - Development Environment',
      exe: 'ToolHive Studio.exe',
    }),
    new MakerDMG({}, ['darwin']),
    new MakerZIP({}, ['darwin']),
    new MakerTarGz({}, ['linux']),
    new MakerRpm({
      options: {
        // RPM package icon
        icon: './icons/icon.png',
      },
    }),
    new MakerDeb({
      options: {
        // Linux .deb package icon
        icon: './icons/icon.png',
      },
    }),
    // Flatpak maker - uncomment and configure when ready to use
    // Requirements: install elfutils package and add Flathub remote
    // Run: flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    // new MakerFlatpak({
    //   options: {
    //     categories: ["Development", "Utility"],
    //     files: [
    //       // Add required files configuration here
    //     ],
    //   },
    // }),
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
