export type PreparedSecret = {
  /** The name of the secret in the secret store */
  secretStoreKey: string
  /** The property in the MCP server's config that the secret maps to */
  target: string
  /** The value of the secret */
  value: string
}

export type SecretFieldValue = {
  name: string
  value: {
    secret: string
    isFromStore: boolean
  }
}
