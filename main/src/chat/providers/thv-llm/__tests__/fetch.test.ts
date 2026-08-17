import { describe, expect, it } from 'vitest'
import {
  isAuthenticationRequiredResponse,
  resolveGatewayFetchInput,
} from '../fetch'

describe('isAuthenticationRequiredResponse', () => {
  it('returns false for non-401 responses', () => {
    expect(
      isAuthenticationRequiredResponse(new Response('', { status: 200 }), '{}')
    ).toBe(false)
  })

  it('returns true for 401 with authentication_required error', () => {
    expect(
      isAuthenticationRequiredResponse(
        new Response('', { status: 401 }),
        JSON.stringify({ error: 'authentication_required' })
      )
    ).toBe(true)
  })

  it('returns true for 401 with authentication text in body', () => {
    expect(
      isAuthenticationRequiredResponse(
        new Response('', { status: 401 }),
        'Authentication required'
      )
    ).toBe(true)
  })
})

describe('resolveGatewayFetchInput', () => {
  it('passes string URLs through', () => {
    expect(
      resolveGatewayFetchInput('http://127.0.0.1:14000/v1/chat/completions')
    ).toEqual({
      url: 'http://127.0.0.1:14000/v1/chat/completions',
      init: undefined,
    })
  })

  it('uses href for URL objects', () => {
    expect(
      resolveGatewayFetchInput(new URL('http://127.0.0.1:14000/v1/models'))
    ).toEqual({
      url: 'http://127.0.0.1:14000/v1/models',
      init: undefined,
    })
  })

  it('reads url and request fields from a Request object', () => {
    const request = new Request('http://127.0.0.1:14000/v1/messages', {
      method: 'POST',
      headers: { 'x-test': '1' },
      body: '{"ok":true}',
    })
    const resolved = resolveGatewayFetchInput(request)

    expect(resolved.url).toBe('http://127.0.0.1:14000/v1/messages')
    expect(resolved.init?.method).toBe('POST')
    expect(resolved.url).not.toBe('[object Request]')
  })

  it('lets init override Request fields', () => {
    const request = new Request('http://127.0.0.1:14000/v1/messages', {
      method: 'POST',
    })
    const resolved = resolveGatewayFetchInput(request, { method: 'GET' })

    expect(resolved.init?.method).toBe('GET')
  })
})
