import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  APP_NAME,
  COMPANY_NAME,
  DEEP_LINK_PROTOCOL,
  DEVELOPER_ID,
  FLATPAK_APP_ID,
  FLATPAK_WRAPPER_NAME,
  GITHUB_ISSUES_URL,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_REPO_URL,
} from '../common/app-info'

const FLATPAK_DIR = path.resolve(import.meta.dirname, '..', 'flatpak')

function desktopFileContent(): string {
  return `[Desktop Entry]
Name=${APP_NAME}
Comment=Install, manage and run MCP servers and connect them to AI agents and clients
GenericName=${APP_NAME}
Exec=${FLATPAK_WRAPPER_NAME} %U
Icon=${FLATPAK_APP_ID}
Type=Application
StartupNotify=true
Categories=Development;Utility;
MimeType=x-scheme-handler/${DEEP_LINK_PROTOCOL};
`
}

function metainfoFileContent(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${FLATPAK_APP_ID}</id>
  <name>${APP_NAME}</name>
  <summary>Install, manage and run MCP servers</summary>
  <metadata_license>CC0-1.0</metadata_license>
  <project_license>Apache-2.0</project_license>

  <developer id="${DEVELOPER_ID}">
    <name>${COMPANY_NAME}</name>
  </developer>

  <description>
    <p>${APP_NAME} is an application that allows you to install, manage and run MCP servers and connect them to AI agents and clients.</p>
  </description>

  <launchable type="desktop-id">${FLATPAK_APP_ID}.desktop</launchable>

  <url type="homepage">${GITHUB_REPO_URL}</url>
  <url type="bugtracker">${GITHUB_ISSUES_URL}</url>

  <content_rating type="oars-1.1" />

  <releases>
    <release version="0.0.1" date="2026-02-18">
      <description>
        <p>Initial release.</p>
      </description>
    </release>
  </releases>

  <!-- TODO: Add real screenshots before Flathub submission -->
  <screenshots>
    <screenshot type="default">
      <caption>${APP_NAME} main window</caption>
      <image>https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/assets/screenshot.png</image>
    </screenshot>
  </screenshots>
</component>
`
}

async function writeIfChanged(
  filePath: string,
  content: string
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const existing = await fs.readFile(filePath, 'utf8').catch(() => null)
  if (existing !== content) {
    await fs.writeFile(filePath, content, 'utf8')
  }
}

export async function generateFlatpakAssets(): Promise<void> {
  await Promise.all([
    writeIfChanged(
      path.join(FLATPAK_DIR, `${FLATPAK_APP_ID}.desktop`),
      desktopFileContent()
    ),
    writeIfChanged(
      path.join(FLATPAK_DIR, `${FLATPAK_APP_ID}.metainfo.xml`),
      metainfoFileContent()
    ),
  ])
}
