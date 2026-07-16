# Holeshot CRM

Version independiente del CRM de Holeshot, lista para subir a GitHub, conectar con Vercel y guardar datos en Supabase.

## Que incluye

- Tablero general con oportunidades, tareas y servicios activos.
- Pipeline de ventas.
- Pipeline de servicios y postventa.
- Clientes.
- Seguimientos.
- Reportes rapidos.
- Exportacion JSON para respaldo.
- Exportacion CSV para revisar datos en Excel o Google Sheets.
- Importacion JSON para restaurar datos.
- Login con Supabase Auth.
- Guardado en base de datos Supabase.

## Importante

Esta version guarda los datos en Supabase. Antes de usarla oficialmente, ejecuta `supabase-schema.sql` en el SQL Editor del proyecto Supabase.

En Supabase, crea los usuarios del equipo desde Authentication. La app usa email y contrasena.

## Abrir localmente

Abre `index.html` en el navegador.

## Subir a GitHub

Desde esta carpeta:

```powershell
git init
git branch -M main
git add .gitignore README.md index.html styles.css app.js logo.png vercel.json supabase-schema.sql
git commit -m "Crear CRM Holeshot"
git remote add origin https://github.com/TU_USUARIO/holeshot-crm.git
git push -u origin main
```

Reemplaza `TU_USUARIO` por tu usuario real de GitHub.

## Vercel

1. Entra a Vercel.
2. Importa el repo `holeshot-crm`.
3. Deja la configuracion como proyecto estatico.
4. Publica.

No hace falta instalar dependencias ni correr build.

## Supabase

1. Entra al proyecto Supabase.
2. Abre SQL Editor.
3. Pega y ejecuta el contenido de `supabase-schema.sql`.
4. Ve a Authentication.
5. Crea los usuarios que podran entrar al CRM.
6. Publica el proyecto en Vercel.
