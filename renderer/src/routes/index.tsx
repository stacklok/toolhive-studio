import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

export function Index() {
  const navigate = useNavigate()

  // Always redirect to default group for consistent routing
  useEffect(() => {
    navigate({ to: '/group/$groupName', params: { groupName: 'default' } })
  }, [navigate])

  // This component just redirects, so return null
  return null
}
