import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ToastProvider } from './components/ui/overlay'
import { CartProvider, FavouritesProvider, WorkspaceProvider } from './store/app'
import { AuthProvider, MetaProvider } from './lib/api'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <MetaProvider>
            <WorkspaceProvider>
              <FavouritesProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </FavouritesProvider>
            </WorkspaceProvider>
          </MetaProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
