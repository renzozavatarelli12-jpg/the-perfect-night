import { useState } from 'react'
import { MessageCircle, Copy } from 'lucide-react'
import LocalNote from './LocalNote'

export default function ShareSheet({ initial, onClose }) {
  const [text, setText] = useState(initial)
  const [copied, setCopied] = useState(null)
  const copy = async () => {
    let ok = true
    try { await navigator.clipboard.writeText(text) } catch { ok = false }
    setCopied(ok ? 'ok' : 'error'); setTimeout(() => setCopied(null), 2200)
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Compartir por WhatsApp" onClick={(e) => e.stopPropagation()}>
        <h3>Compartir por WhatsApp</h3>
        <label><span>Mensaje (podés editarlo)</span><textarea rows={11} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <LocalNote />
        <div className="row end">
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
          <button className="btn ghost" onClick={copy}><Copy size={14} /> {copied === 'ok' ? '¡Copiado!' : copied === 'error' ? 'Copialo a mano' : 'Copiar'}</button>
          <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Abrir WhatsApp</a>
        </div>
      </div>
    </div>
  )
}
