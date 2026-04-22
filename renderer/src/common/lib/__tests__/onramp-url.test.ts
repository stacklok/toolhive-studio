import { describe, it, expect } from 'vitest'
import { APP_IDENTIFIER, DOCS_BASE_URL } from '@common/app-info'
import { buildOnrampDocsUrl } from '../onramp-url'

describe('buildOnrampDocsUrl', () => {
  it('emits utm params in the documented order with tdi when instanceId is provided', () => {
    const url = buildOnrampDocsUrl('/enterprise', {
      campaign: 'enterprise-upgrade',
      content: 'app-header',
      instanceId: 'abc-123',
    })

    expect(url).toBe(
      `${DOCS_BASE_URL}/enterprise?utm_source=${APP_IDENTIFIER}&utm_medium=app&utm_campaign=enterprise-upgrade&utm_content=app-header&tdi=abc-123`
    )
  })

  it('omits the tdi param when instanceId is undefined', () => {
    const url = buildOnrampDocsUrl('/guides-registry/', {
      campaign: 'custom-registry',
      content: 'registry-view-tile',
    })

    expect(url).toBe(
      `${DOCS_BASE_URL}/guides-registry/?utm_source=${APP_IDENTIFIER}&utm_medium=app&utm_campaign=custom-registry&utm_content=registry-view-tile`
    )
    expect(url).not.toContain('tdi=')
  })

  it('omits the tdi param when instanceId is an empty string', () => {
    const url = buildOnrampDocsUrl('/enterprise', {
      campaign: 'enterprise-upgrade',
      content: 'app-header',
      instanceId: '',
    })

    expect(url).not.toContain('tdi=')
  })

  it('url-encodes param values using application/x-www-form-urlencoded', () => {
    const url = buildOnrampDocsUrl('/enterprise', {
      campaign: 'enterprise upgrade',
      content: 'app/header',
      instanceId: 'id with space',
    })

    expect(url).toContain('utm_campaign=enterprise+upgrade')
    expect(url).toContain('utm_content=app%2Fheader')
    expect(url).toContain('tdi=id+with+space')
  })
})
