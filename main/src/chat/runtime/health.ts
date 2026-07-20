type ChatRuntimeHealth = 'initializing' | 'ready' | 'unavailable'

let health: ChatRuntimeHealth = 'initializing'
let unavailableReason: string | undefined

export function getChatUnavailableReason(): string | undefined {
  return unavailableReason
}

export function markChatRuntimeInitializing(): void {
  health = 'initializing'
  unavailableReason = undefined
}

export function markChatRuntimeReady(): void {
  health = 'ready'
  unavailableReason = undefined
}

export function markChatRuntimeUnavailable(reason: string): void {
  health = 'unavailable'
  unavailableReason = reason
}

export function isChatRuntimeReady(): boolean {
  return health === 'ready'
}
