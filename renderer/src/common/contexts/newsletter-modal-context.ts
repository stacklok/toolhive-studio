import { createContext, useContext } from 'react'

export type NewsletterModalContextType = {
  forceOpen: boolean
  openNewsletterModal: () => void
  closeNewsletterModal: () => void
}

export const NewsletterModalContext =
  createContext<NewsletterModalContextType | null>(null)

export function useNewsletterModal(): NewsletterModalContextType {
  const ctx = useContext(NewsletterModalContext)
  if (!ctx) {
    throw new Error(
      'useNewsletterModal must be used within a NewsletterModalProvider'
    )
  }
  return ctx
}
