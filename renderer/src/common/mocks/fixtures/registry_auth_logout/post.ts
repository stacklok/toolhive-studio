import type {
  PostApiV1BetaRegistryAuthLogoutResponse,
  PostApiV1BetaRegistryAuthLogoutData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaRegistryAuthLogout = AutoAPIMock<
  PostApiV1BetaRegistryAuthLogoutResponse,
  PostApiV1BetaRegistryAuthLogoutData
>({
  adipisicing_c: 'magna esse pariatur',
  fugiatc: 'quis',
})
