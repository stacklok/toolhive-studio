import { createFileRoute } from '@tanstack/react-router'
import { InspectorPage } from '@/features/inspector/inspector-page'

export const Route = createFileRoute('/inspector')({
  component: InspectorPage,
})
