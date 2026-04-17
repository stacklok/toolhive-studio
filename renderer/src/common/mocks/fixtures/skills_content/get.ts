import type {
  GetApiV1BetaSkillsContentResponse,
  GetApiV1BetaSkillsContentData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaSkillsContent = AutoAPIMock<
  GetApiV1BetaSkillsContentResponse,
  GetApiV1BetaSkillsContentData
>({
  name: 'my-skill',
  description: 'A helpful skill',
  version: 'v1.0.0',
  body: '# My Skill\n\nThis is the SKILL.md body.\n\n## Usage\n\nUse this skill to do things.',
  files: [{ path: 'SKILL.md', size: 60 }],
})
