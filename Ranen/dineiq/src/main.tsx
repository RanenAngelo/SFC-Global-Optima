import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ToastProvider } from './components/ui/overlay'
import { CartProvider, FavouritesProvider, WorkspaceProvider } from './store/app'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <WorkspaceProvider>
          <FavouritesProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </FavouritesProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
