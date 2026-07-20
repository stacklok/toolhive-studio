import { runChatPromiseOr, runChatSync } from './runtime'
import { PricingService } from './pricing/pricing-service'

export async function getPricingMap() {
  return runChatPromiseOr(PricingService.getPricingMap(), {})
}

/** Test-only: clear cached state so each test starts fresh. */
export function _resetPricingStateForTests(): void {
  runChatSync(PricingService.resetForTests())
}
