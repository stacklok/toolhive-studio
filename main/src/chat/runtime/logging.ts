import { Effect, Logger, LogLevel } from 'effect'
import log from '../../logger'

const electronLogger = Logger.make(
  ({ logLevel, message, cause, annotations }) => {
    const prefix = `[CHAT/${logLevel.label}]`
    const annotationSuffix =
      Object.keys(annotations).length > 0
        ? ` ${JSON.stringify(annotations)}`
        : ''
    const text = `${prefix} ${message}${annotationSuffix}`

    if (logLevel._tag === 'Error' || logLevel._tag === 'Fatal') {
      if (cause._tag === 'Fail') {
        log.error(text, cause.error)
      } else {
        log.error(text)
      }
      return
    }

    if (logLevel._tag === 'Warning') {
      log.warn(text)
      return
    }

    if (logLevel._tag === 'Debug' || logLevel._tag === 'Trace') {
      log.debug(text)
      return
    }

    log.info(text)
  }
)

export const ChatLoggerLayer = Logger.replace(
  Logger.defaultLogger,
  electronLogger
)

export const ChatLogLevelLayer = Logger.minimumLogLevel(LogLevel.Info)

export function chatLogInfo(message: string): Effect.Effect<void> {
  return Effect.logInfo(message)
}

export function chatLogWarning(message: string): Effect.Effect<void> {
  return Effect.logWarning(message)
}

export function chatLogError(
  message: string,
  cause?: unknown
): Effect.Effect<void> {
  return cause === undefined
    ? Effect.logError(message)
    : Effect.logError(message, cause)
}
