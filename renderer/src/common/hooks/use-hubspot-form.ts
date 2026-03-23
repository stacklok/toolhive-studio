import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { submitToHubSpot } from '../lib/hubspot'

export function useHubSpotForm(formId: string, pageName: string) {
  const [consentToProcess, setConsentToProcess] = useState(false)

  const { data: instanceId, isFetched } = useQuery({
    queryKey: ['instance-id'],
    queryFn: () => window.electronAPI.getInstanceId(),
  })

  const isReady = isFetched && !!instanceId

  const submit = (fields: { name: string; value: string }[]) =>
    submitToHubSpot({
      formId,
      fields: [...fields, { name: 'instance_id', value: instanceId! }],
      pageName,
      consentToProcess,
    })

  return { consentToProcess, setConsentToProcess, isReady, submit }
}
