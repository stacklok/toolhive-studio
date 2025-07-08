import log from 'electron-log/main'
import { app } from 'electron'
import path from 'node:path'

const isDevelopment = process.env.NODE_ENV === 'development'

log.transports.file.resolvePathFn = () => {
  const logPath = app.getPath('logs')
  return path.join(logPath, 'main.log')
}

log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
log.transports.console.format = '{h}:{i}:{s}.{ms} > {text}'

if (isDevelopment) {
  log.transports.console.level = 'debug'
  log.transports.file.level = 'info'
} else {
  log.transports.console.level = 'info'
  log.transports.file.level = 'info'
}

log.eventLogger.startLogging()

log.initialize()

export default log
