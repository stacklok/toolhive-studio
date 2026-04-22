import { APP_IDENTIFIER, DOCS_BASE_URL } from '@common/app-info'

type OnrampUrlOptions = {
  campaign: string
  content: string
  instanceId?: string
}

export function buildOnrampDocsUrl(
  path: string,
  { campaign, content, instanceId }: OnrampUrlOptions
): string {
  const params: Array<[string, string]> = [
    ['utm_source', APP_IDENTIFIER],
    ['utm_medium', 'app'],
    ['utm_campaign', campaign],
    ['utm_content', content],
  ]

  if (instanceId) {
    params.push(['tdi', instanceId])
  }

  const query = params
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

  return `${DOCS_BASE_URL}${path}?${query}`
}
