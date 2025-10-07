import { describe, it, expect } from 'vitest'
import { getFormSchemaRemoteMcp } from '../form-schema-remote-mcp'

describe('getFormSchemaRemoteMcp', () => {
  const baseValidInput = {
    name: 'test-remote-server',
    url: 'https://api.example.com/mcp',
    transport: 'streamable-http' as const,
    auth_type: 'none' as const,
    oauth_config: {
      authorize_url: '',
      callback_port: 8080,
      client_id: '',
      client_secret: undefined,
      issuer: '',
      oauth_params: {},
      scopes: '',
      skip_browser: false,
      token_url: '',
      use_pkce: true,
    },
    secrets: [],
    group: 'default',
  }

  describe('auth_type: "none"', () => {
    const noneAuthInput = {
      ...baseValidInput,
      auth_type: 'none' as const,
    }

    it('passes with valid callback_port', () => {
      const input = {
        ...noneAuthInput,
        oauth_config: {
          ...noneAuthInput.oauth_config,
          callback_port: 50051,
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success, `${result.error}`).toBe(true)
    })

    it('fails when callback_port is not defined (required)', () => {
      const input = {
        ...noneAuthInput,
        oauth_config: {
          ...noneAuthInput.oauth_config,
          callback_port: undefined,
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const portError = result.error?.issues.find((issue) =>
        issue.path.includes('callback_port')
      )
      expect(portError?.message).toBe('Callback port is required')
    })

    it('fails when callback_port is below 1024', () => {
      const input = {
        ...noneAuthInput,
        oauth_config: {
          ...noneAuthInput.oauth_config,
          callback_port: 1023,
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const portError = result.error?.issues.find((issue) =>
        issue.path.includes('callback_port')
      )
      expect(portError?.message).toBe('Port must be between 1024 and 65535')
    })

    it('fails when callback_port is above 65535', () => {
      const input = {
        ...noneAuthInput,
        oauth_config: {
          ...noneAuthInput.oauth_config,
          callback_port: 65536,
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const portError = result.error?.issues.find((issue) =>
        issue.path.includes('callback_port')
      )
      expect(portError?.message).toBe('Port must be between 1024 and 65535')
    })
  })

  describe('auth_type: "oauth2"', () => {
    const oauth2Input = {
      ...baseValidInput,
      auth_type: 'oauth2' as const,
      oauth_config: {
        ...baseValidInput.oauth_config,
        authorize_url: 'https://auth.example.com/oauth/authorize',
        token_url: 'https://auth.example.com/oauth/token',
        client_id: 'test-client-id',
      },
    }

    it('passes with all required fields and valid callback_port', () => {
      const input = {
        ...oauth2Input,
        oauth_config: {
          ...oauth2Input.oauth_config,
          callback_port: 8080,
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success, `${result.error}`).toBe(true)
    })

    it('passes without callback_port (optional for oauth2)', () => {
      const result = getFormSchemaRemoteMcp([]).safeParse(oauth2Input)
      expect(result.success, `${result.error}`).toBe(true)
    })

    it('fails with invalid callback_port range', () => {
      const input = {
        ...oauth2Input,
        oauth_config: {
          ...oauth2Input.oauth_config,
          callback_port: 1023,
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const portError = result.error?.issues.find((issue) =>
        issue.path.includes('callback_port')
      )
      expect(portError?.message).toBe('Port must be between 1024 and 65535')
    })

    it('fails when required oauth2 fields are missing', () => {
      const input = {
        ...baseValidInput,
        auth_type: 'oauth2' as const,
        oauth_config: {
          ...baseValidInput.oauth_config,
          authorize_url: '',
          token_url: '',
          client_id: '',
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const errors = result.error?.issues.map((issue) => issue.message)
      expect(errors).toContain('Authorize URL is required for OAuth 2.0')
      expect(errors).toContain('Token URL is required for OAuth2')
      expect(errors).toContain('Client ID is required for OAuth 2.0')
    })
  })

  describe('auth_type: "oidc"', () => {
    const oidcInput = {
      ...baseValidInput,
      auth_type: 'oidc' as const,
      oauth_config: {
        ...baseValidInput.oauth_config,
        issuer: 'https://auth.example.com/',
        client_id: 'test-client-id',
      },
    }

    it('passes with all required fields and valid callback_port', () => {
      const input = {
        ...oidcInput,
        oauth_config: {
          ...oidcInput.oauth_config,
          callback_port: 8080,
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success, `${result.error}`).toBe(true)
    })

    it('passes without callback_port (optional for oidc)', () => {
      const result = getFormSchemaRemoteMcp([]).safeParse(oidcInput)
      expect(result.success, `${result.error}`).toBe(true)
    })

    it('fails with invalid callback_port range', () => {
      const input = {
        ...oidcInput,
        oauth_config: {
          ...oidcInput.oauth_config,
          callback_port: 65536,
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const portError = result.error?.issues.find((issue) =>
        issue.path.includes('callback_port')
      )
      expect(portError?.message).toBe('Port must be between 1024 and 65535')
    })

    it('fails when required oidc fields are missing', () => {
      const input = {
        ...baseValidInput,
        auth_type: 'oidc' as const,
        oauth_config: {
          ...baseValidInput.oauth_config,
          issuer: '',
          client_id: '',
        },
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const errors = result.error?.issues.map((issue) => issue.message)
      expect(errors).toContain('Issuer URL is required for OIDC')
      expect(errors).toContain('Client ID is required for OIDC')
    })
  })

  describe('base field validation', () => {
    it('passes with all valid required fields', () => {
      const result = getFormSchemaRemoteMcp([]).safeParse(baseValidInput)
      expect(result.success, `${result.error}`).toBe(true)
      expect(result.data).toMatchObject({
        name: 'test-remote-server',
        url: 'https://api.example.com/mcp',
        transport: 'streamable-http',
        auth_type: 'none',
      })
    })

    it('fails when name is empty', () => {
      const input = {
        ...baseValidInput,
        name: '',
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const nameError = result.error?.issues.find((issue) =>
        issue.path.includes('name')
      )
      expect(nameError?.message).toBe('Name is required')
    })

    it('fails when url is empty', () => {
      const input = {
        ...baseValidInput,
        url: '',
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const urlError = result.error?.issues.find((issue) =>
        issue.path.includes('url')
      )
      expect(urlError?.message).toBe('The MCP server URL is required')
    })

    it('fails when name contains invalid characters', () => {
      const input = {
        ...baseValidInput,
        name: 'invalid name with spaces!',
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success).toBe(false)
      const nameError = result.error?.issues.find((issue) =>
        issue.path.includes('name')
      )
      expect(nameError?.message).toContain('Invalid server name')
    })

    it('fails when name is already in use', () => {
      const existingWorkloads = [{ name: 'test-remote-server' }] as Array<{
        name: string
      }>

      const result =
        getFormSchemaRemoteMcp(existingWorkloads).safeParse(baseValidInput)
      expect(result.success).toBe(false)
      const nameError = result.error?.issues.find((issue) =>
        issue.path.includes('name')
      )
      expect(nameError?.message).toBe('This name is already in use')
    })

    it('passes with valid transport types', () => {
      const input = {
        ...baseValidInput,
        transport: 'sse' as const,
      }

      const result = getFormSchemaRemoteMcp([]).safeParse(input)
      expect(result.success, `${result.error}`).toBe(true)
    })
  })
})
