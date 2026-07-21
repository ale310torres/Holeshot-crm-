# Holeshot CRM ready v14

Copia lista para usar del CRM de Holeshot. Esta version incluye el arreglo para evitar que el guardado en Supabase se quede congelado en "Guardando en Supabase..." y tambien incluye configuracion de Vercel para no guardar cache vieja.

## Abrir localmente

Abre `index.html` en el navegador.

## Subir a Vercel o GitHub

Sube todos los archivos de esta carpeta. No elimines `supabase-timeout-14.js`, porque ese archivo ayuda a que Supabase no deje la pantalla pegada si tarda demasiado.

Archivos principales:

- `index.html`
- `styles.css`
- `app.js`
- `supabase-timeout-14.js`
- `logo.png`
- `vercel.json`
- `supabase-schema.sql`
- `supabase-add-brand-model.sql`

## Supabase

Si la base esta nueva, ejecuta `supabase-schema.sql` en el SQL Editor de Supabase.

Si ya tenias la base creada, ejecuta tambien `supabase-add-brand-model.sql` para asegurar que existan los campos de marca y modelo.

Los usuarios se crean desde Authentication en Supabase. La app usa email y contrasena.

## Nota importante

Esta copia no usa `save-guard.js`. Si ves ese archivo en otra carpeta anterior, no lo subas con esta version.
