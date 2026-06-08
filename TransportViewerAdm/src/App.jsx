import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'

export default function App() {
  // 🟢 Renderiza as rotas protegidas e o Layout do Administrador
  return <RouterProvider router={router} />
}