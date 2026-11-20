import { runChatPromiseOr, runChatSync } from './runtime'
import { PricingService } from './pricing/pricing-service'

export async function getPricingMap() {
  return runChatPromiseOr(
    PricingService.use((s) => s.getPricingMap()),
    {}
  )
}

/** Test-only: clear cached state so each test starts fresh. */
export function _resetPricingStateForTests(): void {
  runChatSync(PricingService.use((s) => s.resetForTests()))
}
