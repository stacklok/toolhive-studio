import {
  getApiV1BetaWorkloadsOptions,
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { IllustrationAlert } from '@/common/components/illustrations/illustration-alert'
import { IllustrationBag } from '@/common/components/illustrations/illustration-bag'
import { IllustrationCalendar } from '@/common/components/illustrations/illustration-calendar'
import { IllustrationClock } from '@/common/components/illustrations/illustration-clock'
import { IllustrationCreate } from '@/common/components/illustrations/illustration-create'
import { IllustrationCreditCard } from '@/common/components/illustrations/illustration-credit-card'
import { IllustrationDate } from '@/common/components/illustrations/illustration-date'
import { IllustrationDone } from '@/common/components/illustrations/illustration-done'
import { IllustrationDragAndDrop } from '@/common/components/illustrations/illustration-drag-and-drop'
import { IllustrationEdit } from '@/common/components/illustrations/illustration-edit'
import { IllustrationEmptyInbox } from '@/common/components/illustrations/illustration-empty-inbox'
import { IllustrationError } from '@/common/components/illustrations/illustration-error'
import { IllustrationFolder } from '@/common/components/illustrations/illustration-folder'
import { IllustrationHome } from '@/common/components/illustrations/illustration-home'
import { IllustrationLike } from '@/common/components/illustrations/illustration-like'
import { IllustrationLock } from '@/common/components/illustrations/illustration-lock'
import { IllustrationMessage } from '@/common/components/illustrations/illustration-message'
import { IllustrationMug } from '@/common/components/illustrations/illustration-mug'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { IllustrationNoDocuments } from '@/common/components/illustrations/illustration-no-documents'
import { IllustrationNoImages } from '@/common/components/illustrations/illustration-no-images'
import { IllustrationNoLocation } from '@/common/components/illustrations/illustration-no-location'
import { IllustrationNoSearchResults } from '@/common/components/illustrations/illustration-no-search-results'
import { IllustrationNotification } from '@/common/components/illustrations/illustration-notification'
import { IllustrationPackage } from '@/common/components/illustrations/illustration-package'
import { IllustrationQuestion } from '@/common/components/illustrations/illustration-question'
import { IllustrationShield } from '@/common/components/illustrations/illustration-shield'
import { IllustrationStar } from '@/common/components/illustrations/illustration-star'
import { IllustrationStop } from '@/common/components/illustrations/illustration-stop'
import { IllustrationSupport } from '@/common/components/illustrations/illustration-support'
import { IllustrationTag } from '@/common/components/illustrations/illustration-tag'
import { IllustrationTasks } from '@/common/components/illustrations/illustration-tasks'
import { IllustrationUser } from '@/common/components/illustrations/illustration-user'
import { IllustrationVacation } from '@/common/components/illustrations/illustration-vacation'
import { IllustrationWallet } from '@/common/components/illustrations/illustration-wallet'
import { RefreshButton } from '@/common/components/refresh-button'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerStatus } from '@/common/lib/polling'
import { DialogFormRunMcpServerWithCommand } from '@/features/mcp-servers/components/dialog-form-run-mcp-command'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/menu-run-mcp-server'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaWorkloadsOptions({ query: { all: true } })
    ),
  component: Index,
})

export function Index() {
  const { data, refetch } = useSuspenseQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })
  const workloads = data?.workloads ?? []
  const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false)
  const { mutateAsync } = useToastMutation(postApiV1BetaWorkloadsMutation())
  const queryClient = useQueryClient()

  return (
    <div className="grid grid-cols-6">
      <IllustrationAlert />
      <IllustrationBag />
      <IllustrationCalendar />
      <IllustrationClock />
      <IllustrationCreate />
      <IllustrationCreditCard />
      <IllustrationDate />
      <IllustrationDone />
      <IllustrationDragAndDrop />
      <IllustrationEdit />
      <IllustrationEmptyInbox />
      <IllustrationError />
      <IllustrationFolder />
      <IllustrationHome />
      <IllustrationLike />
      <IllustrationLock />
      <IllustrationMessage />
      <IllustrationMug />
      <IllustrationNoConnection />
      <IllustrationNoDocuments />
      <IllustrationNoImages />
      <IllustrationNoLocation />
      <IllustrationNoSearchResults />
      <IllustrationNotification />
      <IllustrationPackage />
      <IllustrationQuestion />
      <IllustrationShield />
      <IllustrationStar />
      <IllustrationStop />
      <IllustrationSupport />
      <IllustrationTag />
      <IllustrationTasks />
      <IllustrationUser />
      <IllustrationVacation />
      <IllustrationWallet />
    </div>
  )

  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">Installed</h1>
        <div className="ml-auto flex gap-2">
          <RefreshButton refresh={refetch} />
          <DropdownMenuRunMcpServer
            openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
          />
        </div>
        <DialogFormRunMcpServerWithCommand
          isOpen={isRunWithCommandOpen}
          onOpenChange={setIsRunWithCommandOpen}
          onSubmit={(data) => {
            mutateAsync(
              {
                body: data,
              },
              {
                onSuccess: async () => {
                  await pollServerStatus(() =>
                    queryClient.fetchQuery(
                      getApiV1BetaWorkloadsByNameOptions({
                        path: { name: data.name as string },
                      })
                    )
                  )
                  queryClient.invalidateQueries(
                    // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
                    getApiV1BetaWorkloadsQueryKey({ query: { all: true } })
                  )
                },
              }
            )
          }}
        />
      </div>
      {workloads.length === 0 ? (
        <div>No servers found</div>
      ) : (
        <GridCardsMcpServers mcpServers={workloads} />
      )}
    </>
  )
}
