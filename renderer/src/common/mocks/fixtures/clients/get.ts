import type {
  GetApiV1BetaClientsResponse,
  GetApiV1BetaClientsData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaClients = AutoAPIMock<
  GetApiV1BetaClientsResponse,
  GetApiV1BetaClientsData
>([
  {
    groups: [
      'reprehenderit sint',
      'cillum id',
      'elit officia non consectetur et',
    ],
    name: 'roo-code',
  },
  {
    groups: [
      'proident fugiat adipisicing cillum',
      'culpa dolor exercitation sed sunt',
      'pariatur aliquip',
    ],
    name: 'vscode-insider',
  },
  {
    groups: [
      'velit elit aute',
      'velit ad amet aliqua',
      'consectetur non laboris',
    ],
    name: 'vscode-insider',
  },
])
