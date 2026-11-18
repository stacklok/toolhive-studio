import { Cause, Effect, Layer, Logger, References } from 'effect'
import log from '../../logger'

const electronLogger = Logger.make(({ logLevel, message, cause, fiber }) => {
  const parts = Array.isArray(message) ? message : [message]
  const textParts = parts.filter((part) => typeof part === 'string')
  const extraArgs = parts.filter((part) => typeof part !== 'string')
  const annotations = fiber.getRef(References.CurrentLogAnnotations)
  const annotationSuffix =
    Object.keys(annotations).length > 0 ? ` ${JSON.stringify(annotations)}` : ''
  const text = `[CHAT/${logLevel.toUpperCase()}] ${textParts.join(' ')}${annotationSuffix}`

  if (logLevel === 'Error' || logLevel === 'Fatal') {
    const failure = Cause.findErrorOption(cause)
    if (failure._tag === 'Some') {
      extraArgs.push(failure.value)
    }
    log.error(text, ...extraArgs)
    return
  }

  if (logLevel === 'Warn') {
    log.warn(text, ...extraArgs)
    return
  }

  if (logLevel === 'Debug' || logLevel === 'Trace') {
    log.debug(text, ...extraArgs)
    return
  }

  log.info(text, ...extraArgs)
})

export const ChatLoggerLayer = Logger.layer([electronLogger])

export const ChatLogLevelLayer = Layer.succeed(References.MinimumLogLevel)(
  'Info'
)

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
