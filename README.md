# Holeshot CRM - copia tipo Homepower

Esta es una copia nueva basada en el CRM funcional tipo Homepower/LeadFlow, adaptada para Holeshot.

No usa la app estatica vieja de `app.js`, ni `save-guard`, ni parches externos. Es una app React/Vite con Supabase, rutas privadas, leads, pipeline, tareas, usuarios y configuracion.

## Que cambia contra la version vieja

- Login y sesion con el patron del CRM funcional.
- Leads guardados directamente en Supabase con `.insert().select().single()`.
- Perfil de usuario con cache local para que el CRM no se quede cargando si Supabase tarda.
- Bootstrap automatico: si el usuario entra y no tiene perfil, el CRM intenta crear la organizacion Holeshot y ponerlo como owner.
- SQL idempotente: puedes ejecutar `supabase/schema.sql` mas de una vez.

## Supabase

1. Entra al proyecto de Supabase de Holeshot.
2. Abre SQL Editor.
3. Ejecuta completo el archivo `supabase/schema.sql`.
4. En Authentication, crea el usuario que entrara al CRM.
5. Entra al CRM con ese email y contrasena. El perfil Holeshot owner se crea automaticamente.

## Local

```powershell
npm install
npm run dev
```

## Vercel

Sube esta carpeta a GitHub y conecta el repo en Vercel.

Variables recomendadas en Vercel:

```env
VITE_SUPABASE_URL=https://esjqybxzpqtonkcomdtb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanF5Ynh6cHF0b25rY29tZHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTE2NTgsImV4cCI6MjA5OTcyNzY1OH0.DEGP5xyOsdl41qFiFaoZfophSKiWdXIcKmq7_wv9nbg
VITE_APP_NAME=Holeshot CRM
```

Build command:

```text
npm run build
```

Output:

```text
dist
```

## Importante

Esta copia reemplaza la base anterior. Para evitar cache y conflictos, no mezcles estos archivos con `save-guard.js`, `supabase-timeout-v15.js` ni `holeshot-lead-save-v15.js`.
