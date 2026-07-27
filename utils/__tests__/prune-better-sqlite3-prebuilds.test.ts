import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getBetterSqlite3PrebuildNames,
  pruneBetterSqlite3Prebuilds,
} from '../prune-better-sqlite3-prebuilds'

describe('getBetterSqlite3PrebuildNames', () => {
  it('keeps glibc and musl prebuilds for linux', () => {
    expect(getBetterSqlite3PrebuildNames('linux', 'arm64')).toEqual(
      new Set(['linux-arm64.node', 'linuxmusl-arm64.node'])
    )
  })

  it('keeps a single prebuild for darwin and win32', () => {
    expect(getBetterSqlite3PrebuildNames('darwin', 'x64')).toEqual(
      new Set(['darwin-x64.node'])
    )
    expect(getBetterSqlite3PrebuildNames('win32', 'arm64')).toEqual(
      new Set(['win32-arm64.node'])
    )
  })

  it('returns an empty set for unsupported platforms', () => {
    expect(getBetterSqlite3PrebuildNames('aix', 'x64')).toEqual(new Set())
  })
})

describe('pruneBetterSqlite3Prebuilds', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('removes prebuilds for other platforms and architectures', () => {
    const prebuildsDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'better-sqlite3-prebuilds-')
    )
    tempDirs.push(prebuildsDir)

    for (const name of [
      'linux-arm64.node',
      'linuxmusl-arm64.node',
      'linux-x64.node',
      'linuxmusl-x64.node',
      'darwin-arm64.node',
    ]) {
      fs.writeFileSync(path.join(prebuildsDir, name), name)
    }

    pruneBetterSqlite3Prebuilds(prebuildsDir, 'linux', 'arm64')

    expect(fs.readdirSync(prebuildsDir).sort()).toEqual([
      'linux-arm64.node',
      'linuxmusl-arm64.node',
    ])
  })

  it('does not delete prebuilds for an unsupported platform', () => {
    const prebuildsDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'better-sqlite3-prebuilds-')
    )
    tempDirs.push(prebuildsDir)

    for (const name of ['linux-arm64.node', 'darwin-x64.node']) {
      fs.writeFileSync(path.join(prebuildsDir, name), name)
    }

    pruneBetterSqlite3Prebuilds(prebuildsDir, 'aix', 'x64')

    expect(fs.readdirSync(prebuildsDir).sort()).toEqual([
      'darwin-x64.node',
      'linux-arm64.node',
    ])
  })
})
