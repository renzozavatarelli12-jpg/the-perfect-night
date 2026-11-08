import { createContext, useCallback, useContext, useState } from 'react'

const Ctx = createContext(() => Promise.resolve(false))
// const ask = useConfirm(); if (await ask('¿Borrar?')) ...
export const useConfirm = () => useContext(Ctx)

export function ConfirmProvider({ children }) {
  const [q, setQ] = useState(null)
  const ask = useCallback((text, ok = 'Sí, seguir') => new Promise((res) => setQ({ text, ok, res })), [])
  const close = (v) => { q.res(v); setQ(null) }
  return (
    <Ctx.Provider value={ask}>
      {children}
      {q && (
        <div className="overlay over" onClick={() => close(false)}>
          <div className="sheet" role="alertdialog" aria-label={q.text} onClick={(e) => e.stopPropagation()}>
            <p>{q.text}</p>
            <div className="row end">
              <button className="btn ghost" onClick={() => close(false)}>Mejor no</button>
              <button className="btn" autoFocus onClick={() => close(true)}>{q.ok}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
