import { http, HttpResponse } from 'msw'

const handlers = [
  http.get('*/auth/providers', () => {
    return HttpResponse.json({
      mock: {
        id: 'keycloak',
        name: 'Keycloak',
        type: 'oauth',
        signinUrl: 'http://localhost:6463/api/auth/signin/keycloak',
        callbackUrl: 'http://localhost:6463/api/auth/callback/keycloak',
      },
    })
  }),
]

export default handlers
