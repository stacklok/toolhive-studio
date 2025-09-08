import { faker } from '@faker-js/faker'
import type {
  v1CreateProfileResponse,
  v1ListProfilesResponse,
  v1Profile,
} from '@stacklok/api-minder/generated/types.gen'
import { http, HttpResponse } from 'msw'
export const newlyCreatedProfile: { value: v1Profile | null } = { value: null }

const mockProfile: v1Profile = {
  context: { project: '123' },
  id: 'id1',
  name: 'test',
  labels: [],
  repository: [
    {
      type: 'stacklok/branch_protection_enforce_admins',
      params: { branch: 'main' },
      def: { enforce_admins: false },
      name: 'Enforce branch protection rules for admins',
    },
    {
      type: 'stacklok/branch_protection_require_pull_request_last_push_approval',
      params: { branch: 'main' },
      def: { require_last_push_approval: true },
      name: 'Disregard self-approvals on PRs',
    },
    {
      type: 'stacklok/license',
      params: {},
      def: { license_filename: 'LICENSE', license_type: 'MIT' },
      name: 'Ensure a license file is present',
    },
    {
      type: 'stacklok/secret_scanning',
      params: {},
      def: { enabled: true, skip_private_repos: true },
      name: 'Enable secret scanning to detect hardcoded secrets',
    },
    {
      type: 'stacklok/secret_push_protection',
      params: {},
      def: { enabled: true, skip_private_repos: true },
      name: 'Enable secret push protection to avoid pushing hardcoded secrets',
    },
  ],
  buildEnvironment: [],
  artifact: [
    {
      type: 'stacklok/artifact_attestation_slsa',
      params: { tags: ['latest'], type: 'container' },
      def: {
        runner_environment: 'github-hosted',
        signer_identity: '.github/workflows/build-image-signed-ghat.yml',
        workflow_ref: 'refs/heads/main',
      },
      name: 'Verify the integrity of an artifact using SLSA',
    },
  ],
  pullRequest: [
    {
      type: 'stacklok/pr_trusty_check',
      params: {},
      def: { action: 'review' },
      name: 'Ensure pull requests do not add dependencies with a low Trusty score',
    },
  ],
  release: [],
  pipelineRun: [],
  taskRun: [],
  build: [],
  selection: [],
  remediate: 'off',
  alert: 'on',
  type: 'profile',
  version: 'v1',
  displayName: 'test',
}

const handlers = [
  http.get('*/v1/profiles', () => {
    const response: v1ListProfilesResponse = {
      profiles: [mockProfile],
    }

    return HttpResponse.json(response)
  }),
  http.post('*/v1/profile', async ({ request }) => {
    const data = await request.json()

    newlyCreatedProfile.value = {
      id: faker.string.uuid(),
      name: faker.system.fileName(),
      type: 'profile',
      version: 'v1',
      labels: [],
      pullRequest: [],
      artifact: [],
      buildEnvironment: [],
      remediate: 'off',
      alert: 'on',
      repository: [
        {
          type: faker.system.fileName(),
          params: {
            branch: '',
          },
          def: {
            allow_force_pushes: faker.datatype.boolean(),
          },
          name: faker.system.fileName(),
        },
      ],
      displayName: faker.internet.displayName(),
      ...(typeof data === 'object' ? data?.profile : {}),
    }

    if (newlyCreatedProfile.value?.context === undefined) {
      // this was an error not caught by the tests otherwise
      throw new Error('context needs to be specified')
    }

    const response: v1CreateProfileResponse = {
      profile: newlyCreatedProfile.value as v1Profile,
    }

    return HttpResponse.json(response)
  }),
]

export default handlers
