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
  `prefers-reduced-motion`).
- **Reserva de citas** (`/citas`): calendario dinámico que solo muestra los días/horarios que el
  artista habilitó; previene la doble reserva.
- **Panel del artista** (`/admin`): acceso con contraseña; define disponibilidad por día y revisa
  las solicitudes de cita recibidas.

## Variables de entorno

Define estas variables (ver `.env.example`):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión Postgres. Local: `postgres://postgres:PASS@localhost:5432/drummer`. Vercel/Neon: la connection string con `?sslmode=require`. |
| `ADMIN_PASSWORD` | Contraseña del panel `/admin`. Usa una fuerte en producción. |

> Las tablas (`availability`, `appointments`) se crean solas en el primer arranque (no necesitas
> migraciones manuales).

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
2. **Crear la base de datos:** pestaña **Storage → Create Database → Postgres** (Neon).
   Conéctala al proyecto.
3. **Variables de entorno** (Project Settings → Environment Variables):
   - `DATABASE_URL` → la connection string de la base (incluye `?sslmode=require`).
     Si Vercel solo inyecta `POSTGRES_URL`, copia su valor también en `DATABASE_URL`.
   - `ADMIN_PASSWORD` → una contraseña fuerte.
4. **Deploy.** En el primer request se crean las tablas automáticamente. Entra a `/admin`,
   carga tu disponibilidad y listo.

## Scripts

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # linter
```
