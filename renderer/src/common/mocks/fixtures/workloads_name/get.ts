import type {
  GetApiV1BetaWorkloadsByNameResponse,
  GetApiV1BetaWorkloadsByNameData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedGetApiV1BetaWorkloadsByName = AutoAPIMock<
  GetApiV1BetaWorkloadsByNameResponse,
  GetApiV1BetaWorkloadsByNameData
>({
  name: 'postgres-db',
  image: 'ghcr.io/postgres/postgres-mcp-server:latest',
  transport: 'stdio',
  host: '127.0.0.1',
  target_port: 28135,
  cmd_arguments: [],
  env_vars: {},
  secrets: [],
  volumes: [],
  network_isolation: false,
  group: 'default',
})
  .scenario('not-found', (mock) =>
    mock.overrideHandler(() =>
      HttpResponse.json({ error: 'Not found' }, { status: 404 })
    )
  )
  .scenario('server-error', (mock) =>
    mock.overrideHandler(() =>
      HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
    )
  )
