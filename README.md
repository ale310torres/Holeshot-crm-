# Holeshot CRM ready v15

Copia lista para usar del CRM de Holeshot. Esta version incluye un guardado directo para ventas, timeouts reales para Supabase y configuracion de Vercel para no guardar cache vieja.

## Abrir localmente

Abre `index.html` en el navegador.

## Subir a Vercel o GitHub

Sube todos los archivos de esta carpeta. No elimines `supabase-timeout-v15.js` ni `holeshot-lead-save-v15.js`, porque esos archivos evitan que el formulario de venta se quede pegado si Supabase tarda demasiado.

Archivos principales:

- `index.html`
- `styles.css`
- `app.js`
- `supabase-timeout-v15.js`
- `holeshot-lead-save-v15.js`
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
