import { promises as fs } from 'node:fs'
import type { ForgeMakeResult } from '@electron-forge/shared-types'

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf])

/**
 * Strips the UTF-8 BOM from RELEASES files produced by Squirrel.Windows.
 *
 * electron-winstaller generates RELEASES files with a UTF-8 BOM prefix (EF BB BF).
 * Squirrel.Windows fails to parse BOM-prefixed RELEASES when computing checksums,
 * causing "Checksummed file size doesn't match" errors during client updates.
 */
export async function stripBomFromReleasesFiles(
  makeResults: ForgeMakeResult[]
): Promise<void> {
  for (const result of makeResults) {
    const releasesFiles = result.artifacts.filter((f) => f.endsWith('RELEASES'))

    for (const releasesPath of releasesFiles) {
      try {
        const content = await fs.readFile(releasesPath)

        if (
          content.length >= 3 &&
          content[0] === UTF8_BOM[0] &&
          content[1] === UTF8_BOM[1] &&
          content[2] === UTF8_BOM[2]
        ) {
          await fs.writeFile(releasesPath, content.subarray(3))
          console.log(`[postMake] Stripped UTF-8 BOM from ${releasesPath}`)
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`[postMake] Could not process RELEASES file: ${error}`)
        }
      }
    }
  }
}
