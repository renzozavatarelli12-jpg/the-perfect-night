import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Hoy from './pages/Hoy'
import Grupo from './pages/Grupo'
import Minijuegos from './pages/Minijuegos'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Hoy />} />
        <Route path="grupo" element={<Grupo />} />
        <Route path="minijuegos" element={<Minijuegos />} />
        <Route path="*" element={<Hoy />} />
      </Route>
    </Routes>
  )
}
