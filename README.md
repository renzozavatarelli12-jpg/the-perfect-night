# the perfect night.

Web privada de mi grupo de amigos. React + Vite, datos en `localStorage` por ahora.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera /dist (Vercel lo toma solo)
```

- Datos de ejemplo: `src/data/seed.js`. Todo es editable también desde la propia web.
- Persistencia: solo `src/store.jsx`. Para pasar a Supabase se cambia ese archivo.
- Deploy: subir a GitHub e importar en Vercel (`vercel.json` ya tiene el rewrite para las rutas).

## Publicar
1. GitHub: subir el proyecto (sin `node_modules`).
2. Vercel: Add New > Project > importar el repo > Deploy (Vite se detecta solo).
3. Sincronizar al grupo: crear proyecto en Supabase, correr `supabase/schema.sql`, y cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver `.env.example`) en Vercel. Hasta entonces cada persona ve sus propios datos (localStorage).
