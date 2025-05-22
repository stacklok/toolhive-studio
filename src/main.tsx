import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {App} from './app/app.tsx'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ReactQueryDevtools initialIsOpen={false} position='left' />
  </StrictMode>,
)
