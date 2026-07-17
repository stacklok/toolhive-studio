import { Effect } from 'effect'
import { getApiV1BetaWorkloads } from '@common/api/generated/sdk.gen'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import { getTearingDownState } from '../../app-state'
import { createMainProcessApiClient } from '../../unix-socket-fetch'
import { isToolhiveRunning } from '../../toolhive-manager'
import {
  writeProvider,
  deleteProvider,
  clearAllProviders,
  writeSelectedModel,
  writeEnabledMcpTools,
  deleteEnabledMcpTools,
  writeEnabledSkill,
  deleteEnabledSkill,
  deleteEnabledSkillsNotIn,
} from '../../db/writers/chat-settings-writer'
import {
  readChatProvider,
  readSelectedModel,
  readEnabledMcpTools,
  readEnabledSkills,
} from '../../db/readers/chat-settings-reader'
import {
  CHAT_PROVIDER_INFO,
  LOCAL_PROVIDER_IDS,
  type LocalProviderId,
} from '../constants'
import { StorageError } from '../runtime/errors'
import { chatLogInfo, chatLogWarning } from '../runtime/logging'

type ProviderId = (typeof CHAT_PROVIDER_INFO)[number]['id']

export type ChatSettingsProvider =
  | {
      providerId: 'ollama' | 'lmstudio'
      endpointURL: string
      enabledTools: string[]
    }
  | {
      providerId: Exclude<ProviderId, 'ollama' | 'lmstudio'>
      apiKey: string
      enabledTools: string[]
    }

export interface ChatSettingsSelectedModel {
  provider: string
  model: string
}

const isLocalProvider = (providerId: string): providerId is LocalProviderId =>
  LOCAL_PROVIDER_IDS.includes(providerId as LocalProviderId)

function wrapSync<A>(
  operation: string,
  fn: () => A
): Effect.Effect<A, StorageError> {
  return Effect.try({
    try: fn,
    catch: (cause) =>
      new StorageError({
        operation,
        cause,
        userMessage:
          cause instanceof Error
            ? cause.message
            : 'A storage operation failed.',
      }),
  })
}

export class SettingsRepository extends Effect.Service<SettingsRepository>()(
  'chat/SettingsRepository',
  {
    accessors: true,
    sync: () => ({
      readProvider: (providerId: ProviderId) =>
        wrapSync('readProvider', () => readChatProvider(providerId)),

      writeProvider: (
        providerId: string,
        settings: { apiKey?: string; endpointURL?: string }
      ) =>
        wrapSync('writeProvider', () => {
          writeProvider(providerId, settings)
        }),

      deleteProvider: (providerId: string) =>
        wrapSync('deleteProvider', () => {
          deleteProvider(providerId)
        }),

      clearAllProviders: () =>
        wrapSync('clearAllProviders', () => {
          clearAllProviders()
        }),

      readSelectedModel: () =>
        wrapSync('readSelectedModel', () => readSelectedModel()),

      writeSelectedModel: (provider: string, model: string) =>
        wrapSync('writeSelectedModel', () => {
          writeSelectedModel(provider, model)
        }),

      readEnabledMcpTools: () =>
        wrapSync('readEnabledMcpTools', () => readEnabledMcpTools()),

      writeEnabledMcpTools: (serverName: string, toolNames: string[]) =>
        wrapSync('writeEnabledMcpTools', () => {
          writeEnabledMcpTools(serverName, toolNames)
        }),

      deleteEnabledMcpTools: (serverName: string) =>
        wrapSync('deleteEnabledMcpTools', () => {
          deleteEnabledMcpTools(serverName)
        }),

      readEnabledSkills: () =>
        wrapSync('readEnabledSkills', () => readEnabledSkills()),

      writeEnabledSkill: (name: string) =>
        wrapSync('writeEnabledSkill', () => {
          writeEnabledSkill(name)
        }),

      deleteEnabledSkill: (name: string) =>
        wrapSync('deleteEnabledSkill', () => {
          deleteEnabledSkill(name)
        }),

      pruneEnabledSkillsTo: (installedNames: readonly string[]) =>
        wrapSync('pruneEnabledSkillsTo', () =>
          deleteEnabledSkillsNotIn(installedNames)
        ),

      fetchRunningServerNames: () =>
        Effect.tryPromise({
          try: async () => {
            const client = createMainProcessApiClient()
            const { data } = await getApiV1BetaWorkloads({
              client,
              query: { all: true },
            })
            return (data?.workloads ?? [])
              .filter((w: CoreWorkload) => w.status === 'running')
              .map((w: CoreWorkload) => w.name)
          },
          catch: (cause) =>
            new StorageError({
              operation: 'fetchRunningServerNames',
              cause,
              userMessage: 'Failed to fetch running MCP servers.',
            }),
        }),
    }),
  }
) {}

export class SettingsService extends Effect.Service<SettingsService>()(
  'chat/SettingsService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repo = yield* SettingsRepository

      const defaultProviderSettings = (
        providerId: ProviderId
      ): ChatSettingsProvider =>
        isLocalProvider(providerId)
          ? { providerId, endpointURL: '', enabledTools: [] }
          : {
              providerId: providerId as Exclude<
                ProviderId,
                'ollama' | 'lmstudio'
              >,
              apiKey: '',
              enabledTools: [],
            }

      return {
        getChatSettings: (providerId: ProviderId) =>
          Effect.gen(function* () {
            const dbProvider = yield* repo.readProvider(providerId)
            if (!dbProvider) return defaultProviderSettings(providerId)
            if (isLocalProvider(providerId)) {
              return {
                providerId,
                endpointURL: dbProvider.endpointURL ?? '',
                enabledTools: [],
              }
            }
            return {
              providerId: providerId as Exclude<
                ProviderId,
                'ollama' | 'lmstudio'
              >,
              apiKey: dbProvider.apiKey ?? '',
              enabledTools: [],
            }
          }).pipe(
            Effect.catchTag('StorageError', () =>
              Effect.succeed(defaultProviderSettings(providerId))
            )
          ),

        clearChatSettings: (providerId?: ProviderId) =>
          providerId
            ? repo.deleteProvider(providerId)
            : repo.clearAllProviders(),

        getSelectedModel: () =>
          repo.readSelectedModel().pipe(
            Effect.map((model) =>
              model.provider && model.model
                ? model
                : { provider: '', model: '' }
            ),
            Effect.catchTag('StorageError', () =>
              Effect.succeed({ provider: '', model: '' })
            )
          ),

        saveSelectedModel: (provider: string, model: string) =>
          repo.writeSelectedModel(provider, model),

        saveEnabledMcpTools: (serverName: string, toolNames: string[]) =>
          repo.writeEnabledMcpTools(serverName, toolNames),

        getEnabledMcpTools: () => repo.readEnabledMcpTools(),

        getEnabledMcpServersFromTools: () =>
          Effect.gen(function* () {
            const allEnabledTools = yield* repo.readEnabledMcpTools()
            return Object.keys(allEnabledTools).filter(
              (serverName) => (allEnabledTools[serverName]?.length ?? 0) > 0
            )
          }).pipe(Effect.catchTag('StorageError', () => Effect.succeed([]))),

        getEnabledSkills: () =>
          repo
            .readEnabledSkills()
            .pipe(Effect.catchTag('StorageError', () => Effect.succeed([]))),

        setSkillEnabled: (name: string, enabled: boolean) =>
          Effect.gen(function* () {
            const trimmed = name.trim()
            if (!trimmed) {
              return yield* Effect.fail(
                new StorageError({
                  operation: 'setSkillEnabled',
                  userMessage: 'Skill name cannot be empty.',
                })
              )
            }
            if (enabled) {
              yield* repo.writeEnabledSkill(trimmed)
            } else {
              yield* repo.deleteEnabledSkill(trimmed)
            }
          }),

        pruneEnabledSkillsTo: (installedNames: readonly string[]) =>
          repo
            .pruneEnabledSkillsTo(installedNames)
            .pipe(Effect.catchTag('StorageError', () => Effect.succeed(0))),

        reconcileEnabledMcpTools: () =>
          Effect.gen(function* () {
            if (getTearingDownState() || !isToolhiveRunning()) {
              return
            }

            const enabledMcpTools = yield* repo.readEnabledMcpTools()
            const runningServerNames = yield* repo
              .fetchRunningServerNames()
              .pipe(
                Effect.catchAll((error) =>
                  Effect.gen(function* () {
                    yield* chatLogWarning(
                      'Failed to check running servers for MCP reconciliation'
                    )
                    return yield* Effect.fail(error)
                  })
                )
              )

            const serversToRemove: string[] = []
            for (const [serverName, tools] of Object.entries(enabledMcpTools)) {
              if (
                !runningServerNames.includes(serverName) &&
                tools.length > 0
              ) {
                yield* chatLogInfo(
                  `Cleaning up tools for stopped server: ${serverName}`
                )
                serversToRemove.push(serverName)
              }
            }

            for (const serverName of serversToRemove) {
              yield* repo.deleteEnabledMcpTools(serverName)
            }
          }).pipe(Effect.catchAll(() => Effect.void)),

        saveChatSettings: (
          providerId: ProviderId,
          settings: ChatSettingsProvider
        ) =>
          Effect.gen(function* () {
            if (isLocalProvider(providerId)) {
              yield* repo.writeProvider(providerId, {
                endpointURL:
                  'endpointURL' in settings ? settings.endpointURL : '',
              })
            } else {
              yield* repo.writeProvider(providerId, {
                apiKey: 'apiKey' in settings ? settings.apiKey : '',
              })
            }
          }),

        handleSaveSettings: (
          providerId: string,
          settings:
            | { apiKey: string; enabledTools: string[] }
            | { endpointURL: string; enabledTools: string[] }
        ) =>
          Effect.gen(function* () {
            const providerIdTyped = providerId as ProviderId
            const credentialValue =
              providerIdTyped === 'ollama' || providerIdTyped === 'lmstudio'
                ? 'endpointURL' in settings
                  ? settings.endpointURL
                  : ''
                : 'apiKey' in settings
                  ? settings.apiKey
                  : ''

            if (!credentialValue.trim()) {
              yield* providerIdTyped
                ? repo.deleteProvider(providerIdTyped)
                : repo.clearAllProviders()
              return
            }

            const chatSettingsProvider: ChatSettingsProvider =
              providerIdTyped === 'ollama' || providerIdTyped === 'lmstudio'
                ? {
                    providerId: providerIdTyped,
                    endpointURL: credentialValue,
                    enabledTools: settings.enabledTools,
                  }
                : {
                    providerId: providerIdTyped as Exclude<
                      ProviderId,
                      'ollama' | 'lmstudio'
                    >,
                    apiKey: credentialValue,
                    enabledTools: settings.enabledTools,
                  }

            if (isLocalProvider(providerIdTyped)) {
              yield* repo.writeProvider(providerIdTyped, {
                endpointURL: credentialValue,
              })
            } else {
              yield* repo.writeProvider(providerIdTyped, {
                apiKey: credentialValue,
              })
            }

            return chatSettingsProvider
          }),
      }
    }),
    dependencies: [SettingsRepository.Default],
  }
) {}
