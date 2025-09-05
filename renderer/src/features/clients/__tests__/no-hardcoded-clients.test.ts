import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { glob } from 'glob'
import { CLIENT_NAMES } from '../constants'

/**
 * Test to ensure no hardcoded client names exist in the codebase
 * This prevents regression and ensures all client names come from constants
 */
describe('No Hardcoded Client Names', () => {
  // List of known hardcoded client names that should not exist
  const HARDCODED_CLIENT_NAMES = [
    "'vscode'",
    '"vscode"',
    "'cursor'",
    '"cursor"',
    "'claude-code'",
    '"claude-code"',
    "'vscode-insider'",
    '"vscode-insider"',
    "'cline'",
    '"cline"',
    "'roo-code'",
    '"roo-code"',
    "'windsurf'",
    '"windsurf"',
    "'lm-studio'",
    '"lm-studio"',
    "'goose'",
    '"goose"',
  ]

  // Directories to check for hardcoded client names
  const CLIENT_DIRECTORIES = [
    'renderer/src/features/clients/**/*.ts',
    'renderer/src/features/clients/**/*.tsx',
  ]

  it('should not contain hardcoded client names in client-related files', async () => {
    const files: string[] = []
    for (const pattern of CLIENT_DIRECTORIES) {
      const patternFiles = await glob(pattern, {
        cwd: process.cwd(),
        absolute: true,
      })
      files.push(...Array.from(patternFiles))
    }

    const violations: Array<{
      file: string
      line: number
      content: string
      hardcodedName: string
    }> = []

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          HARDCODED_CLIENT_NAMES.forEach((hardcodedName) => {
            if (line.includes(hardcodedName)) {
              // Skip if it's in a comment or string literal that's part of documentation
              if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
                return
              }

              // Skip if it's in a test description or comment
              if (
                line.includes('describe(') ||
                line.includes('it(') ||
                line.includes('//')
              ) {
                return
              }

              violations.push({
                file: file.replace(process.cwd(), ''),
                line: index + 1,
                content: line.trim(),
                hardcodedName,
              })
            }
          })
        })
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Could not read file ${file}:`, error)
      }
    }

    if (violations.length > 0) {
      const violationMessages = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line} - Found ${v.hardcodedName} in: ${v.content}`
        )
        .join('\n')

      expect.fail(
        `Found ${violations.length} hardcoded client name(s). Use constants from CLIENT_NAMES instead:\n${violationMessages}`
      )
    }
  })

  it('should have all client names defined in constants', () => {
    // This test ensures that if new client names are added to the OpenAPI spec,
    // they should also be added to the constants file

    // Check that we have the expected common clients
    expect(CLIENT_NAMES.VSCODE).toBe('vscode')
    expect(CLIENT_NAMES.CURSOR).toBe('cursor')
    expect(CLIENT_NAMES.CLAUDE_CODE).toBe('claude-code')

    // Check that we have other clients from the OpenAPI enum
    expect(CLIENT_NAMES.VSCODE_INSIDER).toBe('vscode-insider')
    expect(CLIENT_NAMES.CLINE).toBe('cline')
    expect(CLIENT_NAMES.ROO_CODE).toBe('roo-code')
  })
})
