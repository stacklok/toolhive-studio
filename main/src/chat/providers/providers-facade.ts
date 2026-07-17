import { runChatPromiseOr } from '../runtime'
import { ProvidersService } from './providers-service'
import { CHAT_PROVIDER_INFO } from '../constants'

export function discoverToolSupportedModels(): {
  providers: Array<{
    id: string
    name: string
    models: string[]
  }>
} {
  return {
    providers: CHAT_PROVIDER_INFO.map((provider) => ({
      id: provider.id,
      name: provider.name,
      models: provider.models,
    })),
  }
}

export async function fetchProviderModelsHandler(
  providerId: string,
  tempCredential?: string
): Promise<{ id: string; name: string; models: string[] } | null> {
  return runChatPromiseOr(
    ProvidersService.fetchProviderModels(providerId, tempCredential),
    null
  )
}

export async function getAllProvidersHandler(): Promise<
  Array<{ id: string; name: string; models: string[] }>
> {
  return runChatPromiseOr(
    ProvidersService.getAllProviders(),
    discoverToolSupportedModels().providers
  )
}
