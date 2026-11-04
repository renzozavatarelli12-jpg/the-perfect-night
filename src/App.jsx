import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Hoy from './pages/Hoy'
import Nights from './pages/Nights'
import NightNew from './pages/NightNew'
import NightDetail from './pages/NightDetail'
import Boliches from './pages/Boliches'
import Bebidas from './pages/Bebidas'
import Grupo from './pages/Grupo'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="hoy" element={<Hoy />} />
        <Route path="noches" element={<Nights />} />
        <Route path="noches/nueva" element={<NightNew />} />
        <Route path="noches/:id" element={<NightDetail />} />
        <Route path="boliches" element={<Boliches />} />
        <Route path="bebidas" element={<Bebidas />} />
        <Route path="grupo" element={<Grupo />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
