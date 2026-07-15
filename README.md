# Holeshot CRM

Primera version independiente del CRM de Holeshot, lista para subir a GitHub y conectar con Vercel.

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

## Importante

Esta version guarda los datos en el navegador usando `localStorage`. Sirve para empezar rapido, validar el flujo y operar con una computadora principal.

Cuando el flujo este aprobado, el siguiente paso recomendado es conectar una base de datos propia, por ejemplo Supabase, Neon, Firebase o una base PostgreSQL.

## Abrir localmente

Abre `index.html` en el navegador.

## Subir a GitHub

Desde esta carpeta:

```powershell
git init
git branch -M main
git add .gitignore README.md index.html styles.css app.js vercel.json
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
