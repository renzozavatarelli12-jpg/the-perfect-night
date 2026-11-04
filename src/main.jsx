import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import './styles.css'
import App from './App'
import { StoreProvider } from './store'
import { ConfirmProvider } from './components/Confirm'

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ConfirmProvider><App /></ConfirmProvider>
    </BrowserRouter>
  </StoreProvider>
)
