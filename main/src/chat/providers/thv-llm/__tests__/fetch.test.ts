import { describe, expect, it } from 'vitest'
import { isAuthenticationRequiredResponse } from '../fetch'

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
