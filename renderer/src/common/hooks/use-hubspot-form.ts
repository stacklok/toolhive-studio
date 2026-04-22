import { useState } from 'react'
import { submitToHubSpot } from '../lib/hubspot'
import { useInstanceId } from './use-instance-id'

export function useHubSpotForm(formId: string, pageName: string) {
  const [consentToProcess, setConsentToProcess] = useState(false)

  const { instanceId, isFetched } = useInstanceId()

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
