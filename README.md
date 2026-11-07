# the perfect night.

Web privada de mi grupo de amigos. React + Vite, publicada en GitHub Pages. Datos compartidos en Supabase (plan gratis).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera /dist
```

## Cómo se guardan los datos
- `src/store.jsx`: único punto de entrada. Con la nube prendida usa `src/sync.js` (cola de cambios, choques, sin conexión) y `src/cloud.js` (Supabase). Sin la nube, `localStorage` como antes.
- `supabase/schema.sql`: tablas y funciones. Todo pasa por `tpn_join` (código del grupo, validado en el servidor, con límite de intentos), `tpn_pull` y `tpn_push`. Las tablas tienen RLS sin políticas: con la clave pública sola no se puede leer ni escribir nada.
- Cada cambio pisado queda en `tpn_history`; lo borrado conserva su último valor (`deleted = true`).
- La clave publicable y la URL están en `src/cloud.js` (están hechas para ser públicas). La `service_role` no se usa ni va nunca al código.
- Lo que cada celu tenía antes (`tpn-v1` en localStorage) nunca se borra; la app ofrece subirlo al grupo sin pisar nada.

## Código del grupo
No está en el repo. Para cambiarlo (los celus que ya entraron siguen adentro; para sacarlos a todos, también borrar las sesiones):

```sql
update tpn_groups set code_hash = extensions.crypt('nuevo-codigo', extensions.gen_salt('bf'));
-- opcional, obliga a todos a poner el código nuevo:
delete from tpn_sessions;
```
Link de invitación: `https://renzozavatarelli12-jpg.github.io/the-perfect-night/#g=CODIGO`
