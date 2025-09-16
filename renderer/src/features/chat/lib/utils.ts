import { TOOLHIVE_MCP_SERVER_NAME } from './constants'

export const getNormalizedServerName = (serverName: string) => {
  if (serverName === TOOLHIVE_MCP_SERVER_NAME) {
    return 'toolhive mcp'
  }
  return serverName
}
