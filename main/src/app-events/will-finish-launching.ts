import { app } from 'electron'
import { handleDeepLink } from '../deep-links'
import log from '../logger'

export function register() {
  app.on('will-finish-launching', () => {
    log.info('App will finish launching')

    // macOS: deep links arrive via open-url event, not process.argv
    app.on('open-url', (event, url) => {
      event.preventDefault()
      log.info(`[deep-link] open-url event received: ${url}`)
      handleDeepLink(url)
    })
  })
}
