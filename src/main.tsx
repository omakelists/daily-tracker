import './style.css'
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { initI18n } from './util/i18n'
import { App } from './App'

async function main(): Promise<void> {
  await initI18n()
  const root = document.getElementById('root')
  if (!root) throw new Error('Root element not found')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

main()
