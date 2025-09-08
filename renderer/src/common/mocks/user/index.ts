import { faker } from '@faker-js/faker'
import type { v1GetUserResponse } from '@stacklok/api-minder/generated/types.gen'
import { http, HttpResponse } from 'msw'

export const getMockUserResponse = ({
  role = 'admin',
  projectId,
}: {
  role: string
  projectId: string
}): v1GetUserResponse => {
  return {
    user: {
      id: faker.number.int(),
      identitySubject: faker.string.uuid(),
      createdAt: faker.date.past().toJSON(),
      updatedAt: faker.date.recent().toJSON(),
    },
    projects: [
      {
        projectId,
        name: faker.person.fullName(),
        description: faker.lorem.text(),
        createdAt: faker.date.past().toJSON(),
        updatedAt: faker.date.recent().toJSON(),
        displayName: faker.person.fullName(),
      },
    ],
    projectRoles: [
      {
        project: {
          projectId,
          name: faker.person.fullName(),
          description: faker.lorem.text(),
          createdAt: faker.date.past().toJSON(),
          updatedAt: faker.date.recent().toJSON(),
          displayName: faker.person.fullName(),
        },
        role: {
          name: role,
          displayName: role,
          description: 'lorem ipsum dolor sit amet',
        },
      },
    ],
  }
}

const handlers = [
  http.get('*/v1/user', () => {
    const projectId = faker.string.uuid()
    const response = getMockUserResponse({
      role: 'admin',
      projectId,
    })

    return HttpResponse.json(response)
  }),
]

export default handlers
