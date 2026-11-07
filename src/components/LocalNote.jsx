import { useStore } from '../store'

// Solo tiene sentido sin la nube: con la nube, todos ven lo mismo.
export default function LocalNote() {
  if (useStore().online) return null
  return (
    <p className="note">
      Ojo: todo queda guardado en este celu. Los demás no ven tus cambios hasta que se los mandes.
    </p>
  )
}
