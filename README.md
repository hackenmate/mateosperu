# Mateo’s Store

Tienda React + Vite preparada para GitHub Pages y Supabase.

## Incluye
- Catálogo responsive.
- Carrito persistente.
- Checkout por WhatsApp.
- Registro de pedidos en Supabase.
- Panel administrador con Auth.
- Productos, stock y estados de pedido.
- Carga múltiple de imágenes con compresión WebP en el navegador.
- Supabase Storage para cientos o miles de fotos.
- RLS para separar catálogo público y administración.
- GitHub Actions para Pages.

## Configuración
1. Crear proyecto Supabase.
2. Ejecutar `supabase/schema.sql`.
3. Crear un usuario en Supabase Auth.
4. Insertar su UUID en `public.store_admins`.
5. Configurar en GitHub Actions Secrets: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
6. En GitHub > Settings > Pages seleccionar Source: GitHub Actions.
