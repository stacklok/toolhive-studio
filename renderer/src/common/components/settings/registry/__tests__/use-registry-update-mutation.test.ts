import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpResponse } from 'msw'
import React from 'react'

import { useRegistryUpdateMutation } from '../use-registry-update-mutation'
import { REGISTRY_FORM_TYPE } from '../utils'
import {
  REGISTRY_WRONG_AUTH_TOAST,
  REGISTRY_WRONG_ISSUER_TOAST,
  REGISTRY_AUTH_FIELDS_REQUIRED_TOAST,
} from '../registry-errors-message'
import type { RegistryFormData } from '../schema'
import {
  getApiV1BetaRegistryQueryKey,
  getApiV1BetaRegistryByNameServersQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { recordRequests } from '@/common/mocks/node'
import { mockedPutApiV1BetaRegistryByName } from '@/common/mocks/fixtures/registry_name/put'
import { mockedPostApiV1BetaRegistryAuthLogin } from '@/common/mocks/fixtures/registry_auth_login/post'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, Wrapper }
}

const PUT_PATH = '/api/v1beta/registry/default'
const LOGIN_PATH = '/api/v1beta/registry/auth/login'
const LOGOUT_PATH = '/api/v1beta/registry/auth/logout'

describe('useRegistryUpdateMutation', () => {
  describe('happy paths', () => {
    it('sends empty PUT body for the default registry type', async () => {
      const rec = recordRequests()
      const { Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        await result.current.mutateAsync({
          type: REGISTRY_FORM_TYPE.DEFAULT,
        } as RegistryFormData)
      })

      const putReq = rec.recordedRequests.find(
        (r) => r.method === 'PUT' && r.pathname === PUT_PATH
      )
      expect(putReq).toBeDefined()
      expect(putReq?.payload).toEqual({})
    })

    it('sends { url } for the remote registry type and updates the cache', async () => {
      const rec = recordRequests()
      const url = 'https://example.com/registry.json'
      const { queryClient, Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        await result.current.mutateAsync({
          type: REGISTRY_FORM_TYPE.URL,
          source: url,
        } as RegistryFormData)
      })

      const putReq = rec.recordedRequests.find(
        (r) => r.method === 'PUT' && r.pathname === PUT_PATH
      )
      expect(putReq?.payload).toEqual({ url })

      const cached = queryClient.getQueryData(getApiV1BetaRegistryQueryKey())
      expect(cached).toMatchObject({
        registries: [expect.objectContaining({ type: 'url', source: url })],
      })
    })

    it('sends { local_path } for the local registry type', async () => {
      const rec = recordRequests()
      const localPath = '/var/tmp/registry.json'
      const { Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        await result.current.mutateAsync({
          type: REGISTRY_FORM_TYPE.LOCAL_PATH,
          source: localPath,
        } as RegistryFormData)
      })

      const putReq = rec.recordedRequests.find(
        (r) => r.method === 'PUT' && r.pathname === PUT_PATH
      )
      expect(putReq?.payload).toEqual({ local_path: localPath })
    })

    it('sends api_url with auth and calls login when both auth fields are set', async () => {
      const rec = recordRequests()
      const apiUrl = 'http://localhost:8080/api/registry'
      const { queryClient, Wrapper } = createWrapper()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        await result.current.mutateAsync({
          type: REGISTRY_FORM_TYPE.API_URL,
          source: apiUrl,
          client_id: 'my-client',
          issuer_url: 'https://issuer.example.com',
        } as RegistryFormData)
      })

      const putReq = rec.recordedRequests.find(
        (r) => r.method === 'PUT' && r.pathname === PUT_PATH
      )
      expect(putReq?.payload).toEqual({
        api_url: apiUrl,
        allow_private_ip: true,
        auth: {
          client_id: 'my-client',
          issuer: 'https://issuer.example.com',
        },
      })

      const loginReq = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === LOGIN_PATH
      )
      expect(loginReq).toBeDefined()

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getApiV1BetaRegistryQueryKey(),
      })
    })

    it('sends only the set auth field when one of client_id/issuer is blank', async () => {
      const rec = recordRequests()
      const apiUrl = 'http://localhost:8080/api/registry'
      const { Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        await result.current.mutateAsync({
          type: REGISTRY_FORM_TYPE.API_URL,
          source: apiUrl,
          client_id: 'only-client',
          issuer_url: '',
        } as RegistryFormData)
      })

      const putReq = rec.recordedRequests.find(
        (r) => r.method === 'PUT' && r.pathname === PUT_PATH
      )
      expect(putReq?.payload).toEqual({
        api_url: apiUrl,
        allow_private_ip: true,
        auth: { client_id: 'only-client' },
      })
    })

    it('omits auth and skips login when both client_id and issuer_url are blank', async () => {
      const rec = recordRequests()
      const apiUrl = 'http://localhost:8080/api/registry'
      const { Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        await result.current.mutateAsync({
          type: REGISTRY_FORM_TYPE.API_URL,
          source: apiUrl,
          client_id: '',
          issuer_url: '',
        } as RegistryFormData)
      })

      const putReq = rec.recordedRequests.find(
        (r) => r.method === 'PUT' && r.pathname === PUT_PATH
      )
      expect(putReq?.payload).toEqual({
        api_url: apiUrl,
        allow_private_ip: true,
      })

      const loginReq = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === LOGIN_PATH
      )
      expect(loginReq).toBeUndefined()
    })

    it('removes the registry-servers query after a successful non-api_url update', async () => {
      const { queryClient, Wrapper } = createWrapper()
      const removeSpy = vi.spyOn(queryClient, 'removeQueries')

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        await result.current.mutateAsync({
          type: REGISTRY_FORM_TYPE.URL,
          source: 'https://example.com/registry.json',
        } as RegistryFormData)
      })

      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: getApiV1BetaRegistryByNameServersQueryKey({
          path: { name: 'default' },
        }),
      })
    })
  })

  describe('error paths in putRegistry', () => {
    it('throws REGISTRY_WRONG_ISSUER_TOAST when api_url PUT fails with OIDC pattern', async () => {
      mockedPutApiV1BetaRegistryByName.overrideHandler(
        () =>
          new HttpResponse(
            'OIDC discovery failed: unable to fetch configuration',
            { status: 503, headers: { 'Content-Type': 'text/plain' } }
          )
      )
      const { Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await expect(
        act(async () =>
          result.current.mutateAsync({
            type: REGISTRY_FORM_TYPE.API_URL,
            source: 'http://localhost:8080/api',
            client_id: 'c',
            issuer_url: 'https://issuer.example.com',
          } as RegistryFormData)
        )
      ).rejects.toThrow(REGISTRY_WRONG_ISSUER_TOAST)
    })

    it('throws REGISTRY_AUTH_FIELDS_REQUIRED_TOAST when api_url PUT fails with auth-required pattern', async () => {
      mockedPutApiV1BetaRegistryByName.overrideHandler(
        () =>
          new HttpResponse(
            'auth.issuer and auth.client_id are required when using OAuth',
            { status: 400, headers: { 'Content-Type': 'text/plain' } }
          )
      )
      const { Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await expect(
        act(async () =>
          result.current.mutateAsync({
            type: REGISTRY_FORM_TYPE.API_URL,
            source: 'http://localhost:8080/api',
          } as RegistryFormData)
        )
      ).rejects.toThrow(REGISTRY_AUTH_FIELDS_REQUIRED_TOAST)
    })

    it('rethrows the original string error when api_url PUT fails with a non-matching message', async () => {
      mockedPutApiV1BetaRegistryByName.overrideHandler(
        () =>
          new HttpResponse('boom: something unrelated', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          })
      )
      const { Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await expect(
        act(async () =>
          result.current.mutateAsync({
            type: REGISTRY_FORM_TYPE.API_URL,
            source: 'http://localhost:8080/api',
          } as RegistryFormData)
        )
      ).rejects.toBeDefined()
    })

    it('rethrows PUT failures directly for non-api_url types (remote)', async () => {
      mockedPutApiV1BetaRegistryByName.overrideHandler(() =>
        HttpResponse.json({ error: 'upstream down' }, { status: 500 })
      )
      const { Wrapper } = createWrapper()

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      await expect(
        act(async () =>
          result.current.mutateAsync({
            type: REGISTRY_FORM_TYPE.URL,
            source: 'https://example.com/registry.json',
          } as RegistryFormData)
        )
      ).rejects.toBeDefined()
    })
  })

  describe('error paths in authenticateWithRegistry', () => {
    it('throws REGISTRY_WRONG_AUTH_TOAST, invalidates the registry query and calls logout when login fails', async () => {
      const rec = recordRequests()
      const apiUrl = 'http://localhost:8080/api/registry'
      mockedPostApiV1BetaRegistryAuthLogin.activateScenario('server-error')

      const { queryClient, Wrapper } = createWrapper()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useRegistryUpdateMutation(), {
        wrapper: Wrapper,
      })

      let rejection: unknown = null
      result.current
        .mutateAsync({
          type: REGISTRY_FORM_TYPE.API_URL,
          source: apiUrl,
          client_id: 'bad-client',
          issuer_url: 'https://issuer.example.com',
        } as RegistryFormData)
        .catch((e) => {
          rejection = e
        })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(rejection).toBeInstanceOf(Error)
      expect((rejection as Error).message).toBe(REGISTRY_WRONG_AUTH_TOAST)

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getApiV1BetaRegistryQueryKey(),
      })

      await waitFor(() => {
        const logoutReq = rec.recordedRequests.find(
          (r) => r.method === 'POST' && r.pathname === LOGOUT_PATH
        )
        expect(logoutReq).toBeDefined()
      })
    })
  })
})
