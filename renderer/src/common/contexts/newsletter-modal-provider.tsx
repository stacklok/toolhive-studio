import { useState, type ReactNode } from 'react'
import { NewsletterModalContext } from './newsletter-modal-context'

export function NewsletterModalProvider({ children }: { children: ReactNode }) {
  const [forceOpen, setForceOpen] = useState(false)

  return (
    <NewsletterModalContext.Provider
      value={{
        forceOpen,
        openNewsletterModal: () => setForceOpen(true),
        closeNewsletterModal: () => setForceOpen(false),
      }}
    >
      {children}
    </NewsletterModalContext.Provider>
  )
}
