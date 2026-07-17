import { Effect } from 'effect'
import {
  getLegacyChatSettingsStore,
  getLegacyThreadsStore,
} from './legacy-store-access'

export class LegacyStoreService extends Effect.Service<LegacyStoreService>()(
  'chat/LegacyStoreService',
  {
    accessors: true,
    sync: () => ({
      getThreadsStore: () => Effect.sync(() => getLegacyThreadsStore()),
      getChatSettingsStore: () =>
        Effect.sync(() => getLegacyChatSettingsStore()),
    }),
  }
) {}
