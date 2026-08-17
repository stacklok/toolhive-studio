import { describe, expect, it } from 'vitest'
import {
  assertLoopbackBaseURL,
  anthropicBaseURLFromGatewayEndpoint,
  googleBaseURLFromGatewayEndpoint,
  buildLoopbackBaseURL,
  effectiveListenPort,
  isClaudeGatewayModel,
  isGeminiGatewayModel,
  isLoopbackHost,
} from '../url'

describe('thv-llm url helpers', () => {
  it('uses default port when proxy listen_port is missing', () => {
    expect(effectiveListenPort({})).toBe(14000)
    expect(effectiveListenPort({ proxy: {} })).toBe(14000)
  })

  it('builds loopback base URL from listen port', () => {
    expect(buildLoopbackBaseURL(14000)).toBe('http://127.0.0.1:14000/v1')
  })

  it('builds Anthropic Messages base URL from the OpenAI gateway endpoint', () => {
    expect(
      anthropicBaseURLFromGatewayEndpoint('http://127.0.0.1:14000/v1')
    ).toBe('http://127.0.0.1:14000/anthropic/v1')
  })

  it('builds Google generateContent base URL from the OpenAI gateway endpoint', () => {
    expect(googleBaseURLFromGatewayEndpoint('http://127.0.0.1:14000/v1')).toBe(
      'http://127.0.0.1:14000/v1beta'
    )
  })

  it('detects Claude models for the Anthropic gateway path', () => {
    expect(isClaudeGatewayModel('claude-sonnet-5')).toBe(true)
    expect(isClaudeGatewayModel('anthropic.claude-sonnet-4')).toBe(true)
    expect(isClaudeGatewayModel('gpt-4.1')).toBe(false)
  })

  it('detects Gemini models for the Google gateway path', () => {
    expect(isGeminiGatewayModel('gemini-2.5-flash')).toBe(true)
    expect(isGeminiGatewayModel('google/gemini-2.5-flash')).toBe(true)
    expect(isGeminiGatewayModel('google.gemini-2.5-pro')).toBe(true)
    expect(isGeminiGatewayModel('gpt-4.1')).toBe(false)
    expect(isGeminiGatewayModel('claude-sonnet-5')).toBe(false)
  })

  it('accepts localhost and 127.0.0.1 as loopback hosts', () => {
    expect(isLoopbackHost('localhost')).toBe(true)
    expect(isLoopbackHost('127.0.0.1')).toBe(true)
    expect(isLoopbackHost('10.0.0.1')).toBe(false)
    expect(isLoopbackHost('example.com')).toBe(false)
  })

  it('assertLoopbackBaseURL rejects non-loopback hosts', () => {
    expect(() => assertLoopbackBaseURL('http://10.0.0.1/v1')).toThrow(
      /loopback-only/
    )
  })

  it('assertLoopbackBaseURL accepts loopback http URLs', () => {
    expect(() =>
      assertLoopbackBaseURL('http://127.0.0.1:14000/v1')
    ).not.toThrow()
  })
})
