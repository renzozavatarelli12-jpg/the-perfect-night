import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Hoy from './pages/Hoy'
import Grupo from './pages/Grupo'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Hoy />} />
        <Route path="grupo" element={<Grupo />} />
        <Route path="*" element={<Hoy />} />
      </Route>
    </Routes>
  )
}
