import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'
import { initializeSupabase } from './integrations/supabase/initializer.ts'

const rootElement = document.getElementById("root")

if (!rootElement) {
  console.error("Root element not found!")
} else {
  const renderApp = async () => {
    try {
      // Test Supabase connection before rendering the app
      await initializeSupabase()
      
      const root = createRoot(rootElement)
      
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      )
      
      console.log("React app rendered successfully")
    } catch (error) {
      console.error("Failed to initialize app:", error)
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h1>Connection Error</h1>
          <p>${error instanceof Error ? error.message : "Failed to connect to the database"}</p>
          <button 
            style="margin-top: 20px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;"
            onclick="window.location.reload()"
          >
            Retry
          </button>
        </div>
      `
    }
  }

  renderApp()
}
