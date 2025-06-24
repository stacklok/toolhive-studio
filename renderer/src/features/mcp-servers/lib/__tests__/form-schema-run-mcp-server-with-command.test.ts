import { it, expect } from 'vitest'
import { getFormSchemaRunMcpCommand } from '../form-schema-run-mcp-server-with-command'

it('passes with valid docker image', () => {
  const validInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(validInput)
  expect(result.success, `${result.error}`).toBe(true)
  expect(result.data).toStrictEqual({
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [
      {
        name: 'GITHUB_ORG',
        value: 'StacklokLabs',
      },
    ],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          isFromStore: false,
          secret: 'foo-bar',
        },
      },
    ],
  })
})

it('passes with valid npx command', () => {
  const validInput = {
    name: 'server-everything',
    transport: 'stdio',
    type: 'package_manager',
    protocol: 'npx',
    package_name: 'server-everything',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(validInput)
  expect(result.success, `${result.error}`).toBe(true)
  expect(result.data).toStrictEqual({
    name: 'server-everything',
    transport: 'stdio',
    type: 'package_manager',
    protocol: 'npx',
    package_name: 'server-everything',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  })
})

it('passes with valid uvx command', () => {
  const validInput = {
    name: 'fetch',
    transport: 'stdio',
    type: 'package_manager',
    protocol: 'uvx',
    package_name: 'mcp-server-fetch',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(validInput)
  expect(result.success, `${result.error}`).toBe(true)
  // NOTE: cmd_arguments is transformed to an array
  expect(result.data).toStrictEqual({
    name: 'fetch',
    transport: 'stdio',
    type: 'package_manager',
    protocol: 'uvx',
    package_name: 'mcp-server-fetch',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  })
})

it('fails when name is empty', () => {
  const invalidInput = {
    name: '',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        name: ['Name is required'],
      }),
    })
  )
})

it('fails when name is not unique', () => {
  const invalidInput = {
    name: 'foo-bar',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([{ name: 'foo-bar' }]).safeParse(
    invalidInput
  )
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        name: ['This name is already in use'],
      }),
    })
  )
})

it('fails when transport is empty', () => {
  const invalidInput = {
    name: 'github',
    transport: '',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        transport: ['Please select either SSE or stdio.'],
      }),
    })
  )
})

it('fails when transport is invalid', () => {
  const invalidInput = {
    name: 'github',
    transport: 'foobar',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        transport: ['Please select either SSE or stdio.'],
      }),
    })
  )
})

it('fails when type is empty', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: '',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        type: ['Invalid input'],
      }),
    })
  )
})

it('fails when type is invalid', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'foobar',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        type: ['Invalid input'],
      }),
    })
  )
})

it('fails when envVars is missing name', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ value: 'some-value' }], // Missing name
  }
  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        envVars: ['Invalid input: expected string, received undefined'],
      }),
    })
  )
})

it('fails when envVars is missing value', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'SOME_KEY' }], // Missing value
    secrets: [],
  }
  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        envVars: ['Invalid input: expected string, received undefined'],
      }),
    })
  )
})

it('fails when secrets is missing', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
  }
  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        secrets: ['Invalid input: expected array, received undefined'],
      }),
    })
  )
})

it('fails when secrets is missing key', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [{ value: { secret: 'foo-bar', isFromStore: false } }],
  }
  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        secrets: ['Invalid input: expected string, received undefined'],
      }),
    })
  )
})

it('fails when secrets is missing value', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [{ name: 'GITHUB_PERSONAL_ACCESS_TOKEN' }], // Missing value
  }
  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        secrets: ['Invalid input: expected object, received undefined'],
      }),
    })
  )
})

it('fails when secrets is missing inner secret value', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          isFromStore: false, // Missing value
        },
      },
    ],
  }
  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        secrets: ['Invalid input: expected string, received undefined'],
      }),
    })
  )
})

it('fails when secrets is missing `isFromStore`', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar', // Missing isFromStore
        },
      },
    ],
  }
  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        secrets: ['Invalid input: expected boolean, received undefined'],
      }),
    })
  )
})

it('docker > fails when image is empty', () => {
  const invalidInput = {
    name: 'github',
    transport: 'foobar',
    type: 'docker_image',
    image: '',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        image: ['Docker image is required'],
      }),
    })
  )
})

it('package_manager > fails when protocol is empty', () => {
  const invalidInput = {
    name: 'fetch',
    transport: 'stdio',
    type: 'package_manager',
    protocol: '',
    package_name: 'mcp-server-fetch',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        protocol: ['Please select either npx, uvx, or go.'],
      }),
    })
  )
})

it('package_manager > fails when protocol is invalid', () => {
  const invalidInput = {
    name: 'fetch',
    transport: 'stdio',
    type: 'package_manager',
    protocol: 'foobar',
    package_name: 'mcp-server-fetch',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        protocol: ['Please select either npx, uvx, or go.'],
      }),
    })
  )
})

it('package_manager > fails when package_name is empty', () => {
  const invalidInput = {
    name: 'fetch',
    transport: 'stdio',
    type: 'package_manager',
    protocol: 'uvx',
    package_name: '',
    cmd_arguments: '-y --oauth-setup',
    envVars: [{ name: 'GITHUB_ORG', value: 'StacklokLabs' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
  }

  const result = getFormSchemaRunMcpCommand([]).safeParse(invalidInput)
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        package_name: ['Package name is required'],
      }),
    })
  )
})
