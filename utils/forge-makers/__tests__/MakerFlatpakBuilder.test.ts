import { describe, expect, it } from 'vitest'
import MakerFlatpakBuilder from '../MakerFlatpakBuilder'

// Access the private generateManifest method for black-box testing via a
// structural cast. This avoids `any` while keeping the test hermetic
// (no file-system I/O, no thv binary required).
interface ManifestGenerator {
  generateManifest(
    appDir: string,
    flatpakDir: string,
    iconPath: string,
    clientFilesystemEntries: string[]
  ): { 'finish-args': string[] }
}

describe('MakerFlatpakBuilder.generateManifest finish-args', () => {
  const maker = new MakerFlatpakBuilder()
  const { 'finish-args': finishArgs } = (
    maker as unknown as ManifestGenerator
  ).generateManifest('app', 'flatpak', 'icon.png', [])

  it('includes the standard Docker socket', () => {
    expect(finishArgs).toContain('--filesystem=/run/docker.sock')
  })

  it('includes the Podman sockets', () => {
    expect(finishArgs).toContain('--filesystem=/run/podman/podman.sock')
    expect(finishArgs).toContain('--filesystem=xdg-run/podman/podman.sock')
  })

  it('includes the Docker Desktop on Linux socket', () => {
    expect(finishArgs).toContain('--filesystem=~/.docker/desktop/docker.sock')
  })
})
