// src/main.tsx
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import Game from './pages/Game'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Game />
  </React.StrictMode>
)
