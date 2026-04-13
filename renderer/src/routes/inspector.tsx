import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { InspectorPage } from '@/features/inspector/inspector-page'

const inspectorSearchSchema = z.object({
  serverName: z.string().optional(),
})

export const Route = createFileRoute('/inspector')({
  component: InspectorPage,
  validateSearch: inspectorSearchSchema,
})
