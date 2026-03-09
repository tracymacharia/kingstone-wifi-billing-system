import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress Radix UI Dialog development warnings about missing DialogTitle
// This is a known issue: https://github.com/radix-ui/primitives/issues/2847
// Our DialogContent component now includes a hidden title by default
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error
  console.error = function (...args: any[]) {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('DialogContent') && args[0].includes('DialogTitle'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
}

createRoot(document.getElementById("root")!).render(<App />)
