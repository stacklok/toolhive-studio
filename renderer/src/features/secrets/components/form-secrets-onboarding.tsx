import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/common/components/ui/card'
import { Label } from '@/common/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/common/components/ui/radio-group'
import { useForm } from 'react-hook-form'
import {
  formSchemaSecretsOnboarding,
  type FormSchemaSecretsOnboarding,
} from '../lib/form-schema-secrets-onboarding'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { Button } from '@/common/components/ui/button'
import { ExternalLinkIcon } from 'lucide-react'

function RadioCard({
  value,
  id,
  title,
  description,
}: {
  value: string
  id: string
  title: string
  description: string
}) {
  return (
    <Card
      className="has-data-[state='checked']:border-input hover:border-input relative
        transition-colors"
    >
      <CardContent>
        <RadioGroupItem
          value={value}
          id={id}
          className="absolute top-6 right-6"
        />
        <Label htmlFor={id}>
          <>
            <span className="absolute inset-0" />
            <CardTitle className="mb-2">{title}</CardTitle>
          </>
        </Label>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

export function SecretsOnboardingForm() {
  const form = useForm<FormSchemaSecretsOnboarding>({
    resolver: zodV4Resolver(formSchemaSecretsOnboarding),
  })

  const typeValue = form.watch('type')

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          alert(`Using ${data.type}`)
        })}
        className="flex flex-col gap-6"
      >
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor={field.name}>Type</FormLabel>

              <RadioGroup
                id={field.name}
                defaultValue={field.value}
                onValueChange={field.onChange}
                className="grid grid-cols-3 gap-2"
              >
                <RadioCard
                  value="encrypted"
                  id="encrypted"
                  title="Encrypted"
                  description="ToolHive encrypts secrets using a password stored in your OS keyring."
                />
                <RadioCard
                  value="1password"
                  id="1password"
                  title="1Password"
                  description="ToolHive retrieves secrets from a 1Password vault."
                />
                <RadioCard
                  value="none"
                  id="none"
                  title="None"
                  description="Secrets are not managed by ToolHive. You can use one-off environment variables instead."
                />
              </RadioGroup>
              <FormMessage />
            </FormItem>
          )}
        />

        {typeValue === 'encrypted' ? (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>

                <FormControl>
                  <Input
                    type="password"
                    autoCorrect="off"
                    autoComplete="off"
                    autoFocus
                    data-1p-ignore
                    placeholder=""
                    defaultValue={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    name={field.name}
                  />
                </FormControl>
                <FormDescription>
                  The password that you wish to use to encrypt & decrypt
                  secrets. This password never leaves your machine. Secrets are
                  stored in the OS keychain (macOS, Windows, Linux) or in a
                  local file (Linux).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {typeValue === '1password' ? (
          <FormField
            control={form.control}
            name="api_token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>1Password API token</FormLabel>

                <FormControl>
                  <Input
                    type="password"
                    autoCorrect="off"
                    autoComplete="off"
                    autoFocus
                    data-1p-ignore
                    placeholder=""
                    defaultValue={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    name={field.name}
                  />
                </FormControl>
                <FormDescription>
                  To use 1Password as your secrets provider, set up a 1Password
                  service account. For detailed instructions, see the{' '}
                  <a
                    className="flex items-baseline gap-1 underline"
                    target="_blank"
                    href="https://developer.1password.com/docs/service-accounts/get-started#create-a-service-account"
                  >
                    1Password documentation.
                    <ExternalLinkIcon className="h-3.5 w-3.5 translate-y-0.5" />
                  </a>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <Button className="ml-auto" type="submit">
          Submit
        </Button>
      </form>
    </Form>
  )
}
