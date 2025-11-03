import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(registry)/registry-group_/$name')({
  component: RegistryGroupDetail,
})

export function RegistryGroupDetail() {
  const { name } = Route.useParams()
  return <div>Hello "{name}"!</div>
}
