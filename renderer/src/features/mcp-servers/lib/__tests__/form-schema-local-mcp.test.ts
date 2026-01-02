import { it, expect } from 'vitest'
import z from 'zod/v4'
import { getFormSchemaLocalMcp } from '../form-schema-local-mcp'

it('passes with valid docker image', () => {
  const validInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  }

  const result = getFormSchemaLocalMcp([]).safeParse(validInput)
  expect(result.success, `${result.error}`).toBe(true)
  expect(result.data).toStrictEqual({
    name: 'github',
    transport: 'stdio',
    proxy_mode: 'streamable-http',
    group: 'default',
    type: 'docker_image',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [
      {
        name: 'GITHUB_ORG',
        value: 'stacklok',
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
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  })
})

it('passes with valid npx command', () => {
  const validInput = {
    name: 'server-everything',
    transport: 'stdio',
    type: 'package_manager',
    group: 'default',
    protocol: 'npx',
    package_name: 'server-everything',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  }

  const result = getFormSchemaLocalMcp([]).safeParse(validInput)
  expect(result.success, `${result.error}`).toBe(true)
  expect(result.data).toStrictEqual({
    name: 'server-everything',
    transport: 'stdio',
    proxy_mode: 'streamable-http',
    group: 'default',
    type: 'package_manager',
    protocol: 'npx',
    package_name: 'server-everything',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  })
})

it('passes with valid uvx command', () => {
  const validInput = {
    name: 'fetch',
    transport: 'stdio',
    type: 'package_manager',
    group: 'default',
    protocol: 'uvx',
    package_name: 'mcp-server-fetch',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  }

  const result = getFormSchemaLocalMcp([]).safeParse(validInput)
  expect(result.success, `${result.error}`).toBe(true)
  // NOTE: cmd_arguments is transformed to an array
  expect(result.data).toStrictEqual({
    name: 'fetch',
    transport: 'stdio',
    proxy_mode: 'streamable-http',
    group: 'default',
    type: 'package_manager',
    protocol: 'uvx',
    package_name: 'mcp-server-fetch',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  })
})

it('fails when name is empty', () => {
  const invalidInput = {
    name: '',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
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

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        name: { errors: ['Name is required'] },
      }),
    })
  )
})

it('fails when name is not unique', () => {
  const invalidInput = {
    name: 'foo-bar',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
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

  const result = getFormSchemaLocalMcp([{ name: 'foo-bar' }]).safeParse(
    invalidInput
  )
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        name: { errors: ['This name is already in use'] },
      }),
    })
  )
})

it('fails when name contains invalid characters', () => {
  const invalidInput = {
    name: 'foo@bar',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
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

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        name: {
          errors: [
            'Invalid server name: it can only contain alphanumeric characters, dots, hyphens, and underscores.',
          ],
        },
      }),
    })
  )
})

it('passes when name contains valid characters', () => {
  const validInput = {
    name: 'foo-bar.test_123',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [],
    secrets: [],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  }

  const result = getFormSchemaLocalMcp([]).safeParse(validInput)
  expect(result.success, `${result.error}`).toBe(true)
})

it('fails when transport is empty', () => {
  const invalidInput = {
    name: 'github',
    transport: '',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
  }

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        transport: {
          errors: [
            'Invalid input: expected "sse"',
            'Invalid input: expected "stdio"',
            'Invalid input: expected "streamable-http"',
          ],
        },
      }),
    })
  )
})

it('fails when transport is invalid', () => {
  const invalidInput = {
    name: 'github',
    transport: 'foobar',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
  }

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        transport: {
          errors: [
            'Invalid input: expected "sse"',
            'Invalid input: expected "stdio"',
            'Invalid input: expected "streamable-http"',
          ],
        },
      }),
    })
  )
})

it('fails when type is empty', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: '',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
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

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        type: { errors: ['Invalid input'] },
      }),
    })
  )
})

it('fails when type is invalid', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'foobar',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
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

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        type: { errors: ['Invalid input'] },
      }),
    })
  )
})

it('fails when envVars is missing name', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ value: 'some-value' }], // Missing name
    secrets: [],
    networkIsolation: false,
  }
  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        envVars: {
          errors: [],
          items: [
            {
              errors: [],
              properties: {
                name: {
                  errors: [
                    'Invalid input: expected string, received undefined',
                  ],
                },
              },
            },
          ],
        },
      }),
    })
  )
})

it('fails when envVars is missing value', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'SOME_KEY' }], // Missing value
    secrets: [],
    networkIsolation: false,
  }
  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        envVars: {
          errors: [],
          items: [
            {
              errors: [],
              properties: {
                value: {
                  errors: [
                    'Invalid input: expected string, received undefined',
                  ],
                },
              },
            },
          ],
        },
      }),
    })
  )
})

it('fails when secrets is missing', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
  }
  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        secrets: {
          errors: ['Invalid input: expected array, received undefined'],
        },
      }),
    })
  )
})

it('fails when secrets is missing key', () => {
  const invalidInput = {
    name: 'github',
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/github/github-mcp-server',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [{ value: { secret: 'foo-bar', isFromStore: false } }],
    networkIsolation: false,
  }
  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        secrets: {
          errors: [],
          items: [
            {
              errors: [],
              properties: {
                name: {
                  errors: [
                    'Invalid input: expected string, received undefined',
                  ],
                },
              },
            },
          ],
        },
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
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [{ name: 'GITHUB_PERSONAL_ACCESS_TOKEN' }], // Missing value
    networkIsolation: false,
  }
  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        secrets: {
          errors: [],
          items: [
            {
              errors: [],
              properties: {
                value: {
                  errors: [
                    'Invalid input: expected object, received undefined',
                  ],
                },
              },
            },
          ],
        },
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
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          isFromStore: false, // Missing value
        },
      },
    ],
    networkIsolation: false,
  }
  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        secrets: {
          errors: [],
          items: [
            {
              errors: [],
              properties: {
                value: {
                  errors: [],
                  properties: {
                    secret: {
                      errors: [
                        'Invalid input: expected string, received undefined',
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
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
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar', // Missing isFromStore
        },
      },
    ],
    networkIsolation: false,
  }
  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        secrets: {
          errors: [],
          items: [
            {
              errors: [],
              properties: {
                value: {
                  errors: [],
                  properties: {
                    isFromStore: {
                      errors: [
                        'Invalid input: expected boolean, received undefined',
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
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
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
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

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        image: { errors: ['Docker image is required'] },
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
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
  }

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        protocol: {
          errors: [
            'Invalid input: expected "npx"',
            'Invalid input: expected "uvx"',
            'Invalid input: expected "go"',
          ],
        },
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
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
    secrets: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: {
          secret: 'foo-bar',
          isFromStore: false,
        },
      },
    ],
    networkIsolation: false,
  }

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        protocol: {
          errors: [
            'Invalid input: expected "npx"',
            'Invalid input: expected "uvx"',
            'Invalid input: expected "go"',
          ],
        },
      }),
    })
  )
})

it('package_manager > fails when package_name is empty', () => {
  const invalidInput = {
    name: 'fetch',
    transport: 'stdio',
    type: 'package_manager',
    group: 'default',
    protocol: 'uvx',
    package_name: '',
    cmd_arguments: ['-y', '--oauth-setup'],
    envVars: [{ name: 'GITHUB_ORG', value: 'stacklok' }],
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

  const result = getFormSchemaLocalMcp([]).safeParse(invalidInput)
  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        package_name: { errors: ['Package name is required'] },
      }),
    })
  )
})

it('passes when name matches editingServerName even if name already exists', () => {
  const existingWorkloads = [
    { name: 'existing-server' },
    { name: 'another-server' },
  ]

  const validInput = {
    name: 'existing-server', // This name already exists but matches editingServerName
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/test/server',
    cmd_arguments: [],
    envVars: [],
    secrets: [],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  }

  // Test with editingServerName set to the same name
  const result = getFormSchemaLocalMcp(
    existingWorkloads,
    'existing-server'
  ).safeParse(validInput)

  expect(result.success, `${result.error}`).toBe(true)
  expect(result.data?.name).toBe('existing-server')
})

it('fails when name matches different existing server name even with editingServerName set', () => {
  const existingWorkloads = [
    { name: 'existing-server' },
    { name: 'another-server' },
    { name: 'third-server' },
  ]

  const invalidInput = {
    name: 'another-server', // This name exists but doesn't match editingServerName
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/test/server',
    cmd_arguments: [],
    envVars: [],
    secrets: [],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  }

  // Test with editingServerName set to a different name
  const result = getFormSchemaLocalMcp(
    existingWorkloads,
    'third-server'
  ).safeParse(invalidInput)

  expect(z.treeifyError(result.error!), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      properties: expect.objectContaining({
        name: { errors: ['This name is already in use'] },
      }),
    })
  )
})

it('passes when name is unique even with editingServerName set', () => {
  const existingWorkloads = [
    { name: 'existing-server' },
    { name: 'another-server' },
  ]

  const validInput = {
    name: 'brand-new-server', // This name is completely new
    transport: 'stdio',
    type: 'docker_image',
    group: 'default',
    image: 'ghcr.io/test/server',
    cmd_arguments: [],
    envVars: [],
    secrets: [],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  }

  // Test with editingServerName set
  const result = getFormSchemaLocalMcp(
    existingWorkloads,
    'existing-server'
  ).safeParse(validInput)

  expect(result.success, `${result.error}`).toBe(true)
  expect(result.data?.name).toBe('brand-new-server')
})
