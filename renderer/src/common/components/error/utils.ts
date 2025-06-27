// Helper function to ensure minimum display time
export async function withMinimumDelay<T>(
  action: () => Promise<T>,
  minTime: number
): Promise<T> {
  const startTime = Date.now()
  const result = await action()
  const elapsedTime = Date.now() - startTime
  const remainingTime = Math.max(0, minTime - elapsedTime)
  if (remainingTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingTime))
  }
  return result
}
