export const MCP_OPTIMIZER_GROUP_NAME = '__mcp-optimizer__'
export const META_MCP_SERVER_NAME = 'toolhive-mcp-optimizer'
export const ALLOWED_GROUPS_ENV_VAR = 'ALLOWED_GROUPS'
export const MCP_OPTIMIZER_REGISTRY_SERVER_NAME = 'mcp-optimizer'
export const DEPRECATED_MCP_OPTIMIZER_REGISTRY_SERVER_NAME = 'meta-mcp'

/**
 * Determines if the platform is probably using native containers.
 * Native containers mean Docker runs directly on the host OS (Linux),
 * as opposed to running in a VM (macOS/Windows with Docker Desktop).
 * When native containers are used, host networking mode allows direct
 * access to the host's network stack.
 */
export function isProbablyUsingNativeContainers(): boolean {
  return window.electronAPI.isLinux
}
