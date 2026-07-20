# HoleShot OS

MVP de Dealer Management System para HoleShot Power Parts. Construido con Next.js App Router, TypeScript, Supabase y Tailwind CSS.

## Incluye

- Dashboard operativo con estados, ingreso abierto estimado y órdenes recientes.
- Clientes y vehículos con búsqueda, edición e historial.
- Órdenes de trabajo con RO automático, estados, diagnósticos, labor, piezas, medios y totales.
- Inventario con búsqueda, compatibilidad y alertas de existencia baja.
- Biblioteca técnica con búsqueda, edición y datos iniciales.
- Supabase Auth, RLS y Storage.
- Diseño oscuro, responsive y listo para Vercel.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Abre el SQL Editor y ejecuta las migraciones en orden:
   - `supabase/migrations/202606270001_initial_schema.sql`
   - `supabase/migrations/202607200001_fast_saves_and_search.sql`
3. En Authentication, crea al menos un usuario con email y contraseña.
4. Copia `.env.example` como `.env.local` y añade la URL y la clave `anon` del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Instala y ejecuta:

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. La aplicación redirige a `/sign-in`.

## Despliegue en Vercel

Importa el repositorio en Vercel, configura las dos variables del archivo `.env.example` y despliega. No se requiere una configuración especial adicional.

## Automatizaciones n8n

El esquema usa tablas y eventos normales de Postgres, por lo que puede conectarse a n8n mediante Supabase Database Webhooks o nodos HTTP/Postgres. Casos sugeridos: aviso al cambiar a `Waiting Approval`, notificación en `Ready for Pickup` y alerta de inventario cuando `quantity <= 1`.

## Notas del MVP

- Los totales y el inventario se protegen mediante triggers de base de datos, no solo desde la interfaz.
- La migración `202607200001_fast_saves_and_search.sql` reduce vueltas al backend al crear órdenes y añadir piezas, y añade índices para que las búsquedas sigan rápidas cuando el CRM tenga más clientes, órdenes e inventario.
- El bucket `work-order-media` es público para que las URLs guardadas sean visibles directamente. Para información sensible, cámbialo a privado y usa URLs firmadas.
- Las políticas actuales dan acceso completo a cualquier usuario autenticado. El siguiente paso de seguridad sería añadir organizaciones y roles (`admin`, `service_writer`, `technician`).
- Los datos técnicos iniciales se incluyen tal como fueron solicitados; deben verificarse contra manuales oficiales antes de usarse en un trabajo mecánico.
