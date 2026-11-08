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

// Escape cierra la ventana de arriba (cada una ya se cierra tocando el fondo; el aviso de migración no tiene cierre).
addEventListener('keydown', (e) => { if (e.key === 'Escape') [...document.querySelectorAll('.overlay')].pop()?.click() })

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <ConfirmProvider><Shell><App /></Shell></ConfirmProvider>
  </BrowserRouter>
)
