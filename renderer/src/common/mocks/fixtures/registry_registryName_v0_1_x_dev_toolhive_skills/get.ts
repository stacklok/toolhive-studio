import type {
  GetRegistryByRegistryNameV01xDevToolhiveSkillsResponse,
  GetRegistryByRegistryNameV01xDevToolhiveSkillsData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

// Name intentionally uses `V01X` (uppercase X): it must match the mock name
// derived by `mocker.ts#toPascalCase` from the path segment `v0.1.x`, which is
// what MSW looks up at runtime. The generated SDK types use `V01x` because
// they come from a different codegen (`@hey-api/openapi-ts`) with its own
// casing rules — don't align these without also updating the mocker.
export const mockedGetRegistryByRegistryNameV01XDevToolhiveSkills = AutoAPIMock<
  GetRegistryByRegistryNameV01xDevToolhiveSkillsResponse,
  GetRegistryByRegistryNameV01xDevToolhiveSkillsData
>({
  skills: [
    {
      name: 'sample-skill',
      namespace: 'io.github.sample',
      description: 'A sample registry skill used as fixture default.',
    },
  ],
  metadata: {
    page: 1,
    limit: 12,
    total: 1,
  },
})
