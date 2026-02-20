import type { CoreWorkload } from '@common/api/generated/types.gen'
import { useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { delay } from '@utils/delay'

const NEW_SERVER_HIGHLIGHT_MS = 2000
const STATUS_CHANGE_HIGHLIGHT_MS = 2500

function useTemporaryFlag(trigger: boolean, durationMs: number) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!trigger) return

    let cancelled = false

    const animate = async () => {
      setActive(true)
      await delay(durationMs)
      if (!cancelled) setActive(false)
    }

    animate()
    return () => {
      cancelled = true
    }
  }, [trigger, durationMs])

  return active
}

export function useCardAnimations(
  name: string,
  status: CoreWorkload['status']
) {
  const search = useSearch({ strict: false })
  const searchNewServerName =
    'newServerName' in search ? search.newServerName : null

  const isNewServer = useTemporaryFlag(
    searchNewServerName === name,
    NEW_SERVER_HIGHLIGHT_MS
  )

  const prevStatusRef = useRef<CoreWorkload['status']>(status)
  const didTransitionToRunning =
    prevStatusRef.current !== status && status === 'running'

  useEffect(() => {
    prevStatusRef.current = status
  }, [status])

  const hadRecentStatusChange = useTemporaryFlag(
    didTransitionToRunning,
    STATUS_CHANGE_HIGHLIGHT_MS
  )

  return { isNewServer, hadRecentStatusChange }
}
