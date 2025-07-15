import path from 'node:path'
import { promises as fs } from 'node:fs'
import { MakerDMG } from '@electron-forge/maker-dmg'
import type { MakerOptions } from '@electron-forge/maker-base'
import type { MakerDMGConfig } from '@electron-forge/maker-dmg'

/**
 * Custom DMG Maker that includes architecture in the filename
 * to prevent conflicts when building multiple architectures
 *
 * This extends the standard MakerDMG but renames the output file
 * to include the target architecture (e.g., ToolHive-x64.dmg, ToolHive-arm64.dmg)
 */
export default class MakerDMGWithArch extends MakerDMG {
  constructor(config: MakerDMGConfig = {}, platforms?: string[]) {
    super(config, platforms)
  }

  private getTargetArch(opts: MakerOptions): string {
    const envArch =
      process.env.ELECTRON_FORGE_ARCH || process.env.npm_config_target_arch
    const cliArch = process.argv
      .find((arg) => arg.includes('--arch='))
      ?.split('=')[1]
    const optsArch = opts.targetArch

    const targetArch = envArch || cliArch || optsArch || process.arch

    console.log(`🔍 Architecture sources:`)
    console.log(`  - Environment: ${envArch}`)
    console.log(`  - CLI: ${cliArch}`)
    console.log(`  - Options: ${optsArch}`)
    console.log(`  - Process: ${process.arch}`)
    console.log(`  - Selected: ${targetArch}`)

    return targetArch
  }

  async make(opts: MakerOptions): Promise<string[]> {
    const { targetArch } = opts

    // Try to get architecture from multiple sources
    const envArch =
      process.env.ELECTRON_FORGE_ARCH ||
      process.env.TARGET_ARCH ||
      process.env.npm_config_target_arch
    const actualArch = envArch || targetArch

    console.log(`🔍 Debug: targetArch received = ${targetArch}`)
    console.log(`🔍 Debug: envArch = ${envArch}`)
    console.log(`🔍 Debug: actualArch (final) = ${actualArch}`)
    console.log(`🔍 Debug: process.arch = ${process.arch}`)

    try {
      const originalResults = await super.make(opts)
      const renamedResults: string[] = []

      for (const filePath of originalResults) {
        const dir = path.dirname(filePath)
        const ext = path.extname(filePath)
        const baseName = path.basename(filePath, ext)

        const newFileName = `${baseName}-${actualArch}${ext}`
        const newFilePath = path.join(dir, newFileName)

        await fs.rename(filePath, newFilePath)
        renamedResults.push(newFilePath)

        console.log(`Created DMG: ${newFileName}`)
      }

      return renamedResults
    } catch (error) {
      console.error(`Error building DMG for ${actualArch}:`, error)
      throw error
    }
  }
}
