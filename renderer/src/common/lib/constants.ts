export const MCP_OPTIMIZER_GROUP_NAME = '__mcp-optimizer__'
export const META_MCP_SERVER_NAME = 'toolhive-mcp-optimizer'
export const ALLOWED_GROUPS_ENV_VAR = 'ALLOWED_GROUPS'
export const MCP_OPTIMIZER_REGISTRY_SERVER_NAME = 'mcp-optimizer'
export const DEPRECATED_MCP_OPTIMIZER_REGISTRY_SERVER_NAME = 'meta-mcp'

/**
 * Heuristic: are we likely running with a native container engine on the same machine?
 *
 * Rationale:
 * - On most Linux hosts, container engines (Docker/Podman) run natively on the same
 *   network stack as the host. In this case, the MCP Optimizer container needs host
 *   networking so it can talk to the ToolHive API on the host directly. We also set
 *   `TOOLHIVE_HOST=127.0.0.1` so the container resolves the API via loopback.
 * - On macOS/Windows, Docker Desktop typically runs in a VM. In that setup, host
 *   networking does not provide access to the macOS/Windows host. Instead, Docker
 *   exposes a special bridge (e.g. `host.docker.internal`) and/or forwarded ports,
 *   so we must NOT request host networking or override the host address.
 *
 * Why this is a heuristic:
 * - "Linux" is used here as a proxy for "native container engine on the same host".
 *   This is not always perfect (e.g., remote Docker hosts, cloud runners, custom
 *   virtualization), but it captures the most common cases with minimal platform logic.
 * - We keep this logic behind a function to centralize the assumption and make future
 *   refinements (e.g., detecting remote engines) straightforward without changing call sites.
 */
export function isProbablyUsingNativeContainers(): boolean {
  return window.electronAPI.isLinux
}
