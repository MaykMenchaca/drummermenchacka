# Drummer Menchacka — Portafolio & Citas

Sitio web del tatuador **Drummer Menchacka**: portafolio de trabajos + sistema de reserva de
citas con un panel privado donde el artista define sus días/horarios disponibles y revisa las
solicitudes. Estética *Artisanal Noir*: modo oscuro con detalles dorados.

Construido con **Next.js 16** (App Router). Toda la lógica de servidor vive dentro de la misma
app (Route Handlers en `src/app/api/*`) y persiste en **PostgreSQL** mediante el driver `pg`
— el mismo código corre en Postgres local y en **Vercel Postgres / Neon** cambiando solo
`DATABASE_URL`. No requiere un backend aparte.

## Funcionalidades

- **Portafolio** cinematográfico: hero con parallax, galería bento con lightbox, secciones
  "Cómo funciona", FAQ e Instagram, micro-interacciones con Framer Motion (respetan
  `prefers-reduced-motion`). Las piezas se leen de la base de datos.
- **Galería autogestionable** (`/admin`): el artista sube fotos de trabajos nuevos (incluso desde
  la cámara del celular) y las cataloga por categoría. Se almacenan en **Vercel Blob**
  (comprimidas con `sharp` al subir) y aparecen al instante en el portafolio.
- **Reserva de citas** (`/citas`): calendario dinámico que solo muestra los días/horarios que el
  artista habilitó; previene la doble reserva. El cliente deja su **WhatsApp** y recibe un
  **enlace de seguimiento** `/cita/<token>` donde ve si su cita está pendiente o confirmada
  (caduca al pasar la cita).
- **Panel del artista** (`/admin`): acceso con contraseña; define disponibilidad, gestiona el
  estado de las citas (pendiente/confirmada/completada/cancelada), las borra, y confirma al
  cliente por **WhatsApp** con un mensaje prellenado.
- **Base de datos ligera:** auto-limpieza semanal (Vercel Cron) que purga citas viejas.

## Variables de entorno

Define estas variables (ver `.env.example`):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión Postgres. Local: `postgres://postgres:PASS@localhost:5432/drummer`. Vercel/Neon: la connection string con `?sslmode=require`. |
| `ADMIN_PASSWORD` | Contraseña del panel `/admin`. **Obligatoria en producción** (sin ella el login no entra). |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del artista, formato internacional sin `+` (ej. `524491234567`). |
| `CRON_SECRET` | Secreto que protege la auto-limpieza (`/api/cron/cleanup`). |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob para subir/borrar fotos. Se inyecta solo al crear el Blob store; en local: `vercel env pull`. |

> Las tablas (`availability`, `appointments`, `tattoos`) se crean solas en el primer arranque
> (sin migraciones manuales). El portafolio arranca con 11 piezas sembradas.

## Desarrollo local

1. Ten un Postgres local corriendo y crea la base: `CREATE DATABASE drummer;`
2. Copia `.env.example` a `.env.local` y rellena `DATABASE_URL` y `ADMIN_PASSWORD`.
3. Instala y arranca:
   ```bash
   npm install
   npm run dev
   ```
4. Abre http://localhost:3000 — panel en http://localhost:3000/admin

## Desplegar en Vercel

1. **Importar el repo** en Vercel. Next.js se detecta automáticamente (framework preset Next.js).
2. **Base de datos:** pestaña **Storage → Create Database → Postgres** (Neon). Conéctala al proyecto.
3. **Almacenamiento de fotos:** pestaña **Storage → Create → Blob**. Conéctalo al proyecto
   (inyecta `BLOB_READ_WRITE_TOKEN` automáticamente).
4. **Variables de entorno** (Project Settings → Environment Variables):
   - `DATABASE_URL` → connection string de la base (incluye `?sslmode=require`). Si Vercel solo
     inyecta `POSTGRES_URL`, copia su valor también en `DATABASE_URL`.
   - `ADMIN_PASSWORD` → una contraseña fuerte.
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` → tu número (ej. `524491234567`).
   - `CRON_SECRET` → una cadena aleatoria larga.
5. **Deploy.** En el primer request se crean las tablas. Entra a `/admin`, carga tu disponibilidad,
   sube fotos y listo. La auto-limpieza corre sola cada semana (ver `vercel.json`).

## Scripts

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # linter
```
