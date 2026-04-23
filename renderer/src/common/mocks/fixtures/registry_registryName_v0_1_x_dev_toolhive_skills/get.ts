import type {
  GetRegistryByRegistryNameV01xDevToolhiveSkillsResponse,
  GetRegistryByRegistryNameV01xDevToolhiveSkillsData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

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
