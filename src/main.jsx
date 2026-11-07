import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import './styles.css'
import App from './App'
import { LocalStoreProvider } from './store'
import { ONLINE } from './cloud'
import { AccountProvider } from './account'
import { Root } from './components/Account'
import { ConfirmProvider } from './components/Confirm'

// Con la nube: primero la persona y su grupo (src/account.jsx); sin la nube, todo en este celu como antes.
const Shell = ONLINE ? ({ children }) => <AccountProvider><Root>{children}</Root></AccountProvider> : LocalStoreProvider

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <ConfirmProvider><Shell><App /></Shell></ConfirmProvider>
  </BrowserRouter>
)
