import { Context, Effect, Layer } from 'effect'
import {
  getLegacyChatSettingsStore,
  getLegacyThreadsStore,
} from './legacy-store-access'

const makeLegacyStoreService = Effect.sync(() => ({
  getThreadsStore: () => Effect.sync(() => getLegacyThreadsStore()),
  getChatSettingsStore: () => Effect.sync(() => getLegacyChatSettingsStore()),
}))

export class LegacyStoreService extends Context.Service<
  LegacyStoreService,
  Effect.Success<typeof makeLegacyStoreService>
>()('chat/LegacyStoreService') {
  static readonly layer = Layer.effect(
    LegacyStoreService,
    makeLegacyStoreService
  )
  static readonly Default = LegacyStoreService.layer
}
