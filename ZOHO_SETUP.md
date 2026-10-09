# Zoho Books — integración en preparación

Implementado: callback OAuth con state de un uso, verificación de la organización Zoho, refresh token cifrado, autorización de usuarios responsables y lectura/sincronización de cotizaciones y facturas.

La ficha de cada oportunidad permite vincular explícitamente un contacto existente de Zoho, consultar sus documentos y crear borradores. La lectura se actualiza al abrir la ficha y con «Actualizar desde Zoho», paginando hasta completar ambas listas. No incluye ejecución periódica en segundo plano ni envío automático al cliente.

Aplicar `supabase/zoho-integration.sql` tras revisar los permisos. Configurar en Vercel, solo servidor: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET y ZOHO_TOKEN_ENCRYPTION_KEY (32 bytes aleatorios en base64). Nunca usar prefijo VITE_ para estas claves.

La ruta `/api/zoho/callback` debe ejecutarse como función Vercel y quedar fuera del rewrite de la aplicación. Antes de activar OAuth, probar esta ruta en producción. Conectar mediante POST autenticado a `/api/zoho/connect`; leer documentos por cliente mediante `/api/zoho/documents`.

La migración inicial y las variables privadas están configuradas. Aplicar la tabla adicional zoho_creation_requests antes del despliegue. Falta autorizar OAuth y verificar la conexión real. No crear documentos de prueba para clientes reales.

Los permisos OAuth permiten leer clientes/cotizaciones/facturas/configuración y crear cotizaciones/facturas. No permiten enviar correos, registrar pagos ni editar/eliminar documentos existentes. Los borradores deben revisarse en Zoho para impuestos y términos. Cada creación reserva una solicitud única antes de llamar a Zoho: ante resultado incierto, se bloquea el reintento del mismo identificador y se revisa Zoho con la referencia CRM indicada. No reintentar con un identificador nuevo sin comprobar si el documento ya existe.

Referencias: https://www.zoho.com/books/api/v3/invoices/ y https://www.zoho.com/books/api/v3/estimates/.
