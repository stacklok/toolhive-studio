/**
 * App identity constants — single source of truth for build-configurable
 * values shared across forge config, deep links, and scripts.
 */

// ── Core identity ────────────────────────────────────────────────────────────

export const APP_NAME = 'ToolHive'
export const APP_DISPLAY_NAME = 'ToolHive Studio'
export const APP_IDENTIFIER = 'toolhive-studio'
export const EXECUTABLE_NAME = 'ToolHive'
export const COMPANY_NAME = 'Stacklok'
export const DEVELOPER_ID = 'com.stacklok'

// ── Platform app IDs ─────────────────────────────────────────────────────────

export const DEEP_LINK_PROTOCOL = 'toolhive-gui'
export const FLATPAK_APP_ID = 'com.stacklok.ToolHive'
export const WINDOWS_APP_USER_MODEL_ID = 'com.stacklok.ToolHive'
export const SINGLE_INSTANCE_LOCK_KEY = 'com.stacklok.ToolHive'
export const AUTO_LAUNCH_DESKTOP_FILENAME = 'toolhive-studio'

// ── Flatpak ──────────────────────────────────────────────────────────────────

export const FLATPAK_WRAPPER_NAME = 'toolhive-wrapper'
export const FLATPAK_MODULE_DIR = 'toolhive'

// ── GitHub ───────────────────────────────────────────────────────────────────

export const GITHUB_OWNER = 'stacklok'
export const GITHUB_REPO = 'toolhive-studio'
export const GITHUB_REPO_URL = 'https://github.com/stacklok/toolhive-studio'
export const GITHUB_ISSUES_URL =
  'https://github.com/stacklok/toolhive-studio/issues'
export const GITHUB_RELEASES_URL =
  'https://github.com/stacklok/toolhive-studio/releases/latest'
export const TOOLHIVE_CLI_OWNER = 'stacklok'
export const TOOLHIVE_CLI_REPO = 'toolhive'

// ── Release / update ─────────────────────────────────────────────────────────

export const RELEASES_BASE_URL = 'https://releases.toolhive.dev'
export const RELEASES_S3_BUCKET = 'toolhive-studio-releases'
export const GITHUB_PAGES_MANIFEST_URL =
  'https://stacklok.github.io/toolhive-studio/latest/index.json'

// ── Community & support URLs ─────────────────────────────────────────────────

export const DOCS_BASE_URL = 'https://docs.stacklok.com/toolhive'
export const DISCORD_URL = 'https://discord.gg/stacklok'
export const DEMO_URL = 'https://stacklok.com/demo/'

// ── Registry ─────────────────────────────────────────────────────────────────

export const DEFAULT_REGISTRY_JSON_URL =
  'https://raw.githubusercontent.com/stacklok/toolhive/refs/heads/main/pkg/registry/data/registry.json'

// ── Privacy / legal ──────────────────────────────────────────────────────────

export const PRIVACY_POLICY_URL =
  'https://www.iubenda.com/privacy-policy/78678281'

// ── HubSpot ──────────────────────────────────────────────────────────────────

export const HUBSPOT_PORTAL_ID = '42544743'
export const HUBSPOT_NEWSLETTER_FORM_ID = '8f75a6a3-bf6d-4cd0-8da5-0092ecfda250'
export const HUBSPOT_EXPERT_CONSULTATION_FORM_ID =
  '5f1a7a2c-5069-44b7-9444-d952c55ce89c'
