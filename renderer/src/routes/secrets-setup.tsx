import { SecretsOnboardingForm } from '@/features/secrets/components/form-secrets-onboarding'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/secrets-setup')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">Secrets</h1>
      </div>
      <p className="mb-6">
        MCP servers often need secrets like API tokens, connection strings, and
        other sensitive parameters. ToolHive provides built-in secrets
        management features, letting you manage these values securely without
        exposing them in plaintext configuration files.
      </p>

      <hr className="my-10 border-0 border-b-1" />

      <h2 className="mb-6 text-2xl font-semibold">Secrets setup</h2>

      <SecretsOnboardingForm />
    </div>
  )
}
