import pg from "pg";
import { randomUUID } from "crypto";
import { del } from "@vercel/blob";

const { Pool } = pg;

let pool;
let schemaReady = false;

const SEED_TATTOOS = [
  {
    title: "Fenix Ascendente",
    category: "Fineline / Sombras",
    hours: "4.5 Horas",
    image_url: "/tattoos/000_mejorada.jpeg",
    featured: true,
    sort_order: 10,
  },
  {
    title: "Peonia Oriental",
    category: "Blackwork / Puntillismo",
    hours: "5 Horas",
    image_url: "/tattoos/3_mejorada.jpeg",
    featured: false,
    sort_order: 20,
  },
  {
    title: "Rosas en Realismo",
    category: "Realismo Sombreado",
    hours: "6 Horas",
    image_url: "/tattoos/4_mejorada.jpeg",
    featured: true,
    sort_order: 30,
  },
  {
    title: "Mariposas Cyber-Tribales",
    category: "Neo-Tribal / Contraste",
    hours: "3 Horas",
    image_url: "/tattoos/5_mejorada.jpeg",
    featured: false,
    sort_order: 40,
  },
  {
    title: "Doble Rostro Surrealista",
    category: "Surrealismo / Dotwork",
    hours: "7 Horas",
    image_url: "/tattoos/7_mejorada.jpeg",
    featured: true,
    sort_order: 50,
  },
  {
    title: "Caligrafia Circular",
    category: "Calligraffiti / Lettering",
    hours: "4 Horas",
    image_url: "/tattoos/88_mejorada.jpeg",
    featured: false,
    sort_order: 60,
  },
  {
    title: "Espartano del Destino",
    category: "Realismo / Black & Grey",
    hours: "6.5 Horas",
    image_url: "/tattoos/999_mejorada.jpeg",
    featured: true,
    sort_order: 70,
  },
  {
    title: "Enredadera de Lilas",
    category: "Fineline / Tintas Rojas",
    hours: "3.5 Horas",
    image_url: "/tattoos/WhatsApp Image 2026-06-02 at 6.01.16 PM_mejorada.jpeg",
    featured: false,
    sort_order: 80,
  },
  {
    title: "Navio de Rosas",
    category: "Neo-tradicional / Blackwork",
    hours: "5.5 Horas",
    image_url: "/tattoos/WhatsApp Image 2026-06-02 at 6.01.17 PM_mejorada.jpeg",
    featured: false,
    sort_order: 90,
  },
  {
    title: "Guerrero Alado",
    category: "Ilustrativo / Sombreado",
    hours: "6 Horas",
    image_url: "/tattoos/WhatsApp Image 2026-06-02 at 6.01.18 PM_mejorada.jpeg",
    featured: false,
    sort_order: 100,
  },
  {
    title: "Gengar Mandala",
    category: "Anime / Geometrico",
    hours: "4 Horas",
    image_url: "/tattoos/WhatsApp Image 2026-06-02 at 6.02.22 PM_mejorada.jpeg",
    featured: false,
    sort_order: 110,
  },
];

function getDatabaseUrl() {
  // Acepta DATABASE_URL (local) o POSTGRES_URL (lo inyecta la integración Neon de Vercel).
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL/POSTGRES_URL no está configurada.");
  }
  return databaseUrl;
}

// Postgres local no usa SSL; cualquier proveedor en la nube (Neon/Vercel/Supabase) sí.
function isLocalDatabase(url) {
  return /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(url);
}

export function getPool() {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    pool = new Pool({
      connectionString,
      ssl: isLocalDatabase(connectionString) ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function ensureSchema() {
  if (schemaReady) return;

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS availability (
      date DATE PRIMARY KEY,
      slots JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      concept TEXT NOT NULL,
      date DATE NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      token TEXT UNIQUE,
      reference_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT appointments_status_check
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
    );

    CREATE TABLE IF NOT EXISTS tattoos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      hours TEXT,
      image_url TEXT NOT NULL,
      blob_path TEXT,
      featured BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reference_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
    ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
      CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));

    CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_idx
      ON appointments (date, time)
      WHERE status IN ('pending', 'confirmed');
  `);

  await seedTattoosIfEmpty();
  schemaReady = true;
}

async function seedTattoosIfEmpty() {
  const countResult = await getPool().query("SELECT COUNT(*)::int AS count FROM tattoos");
  if (countResult.rows[0]?.count > 0) return;

  for (const tattoo of SEED_TATTOOS) {
    await getPool().query(
      `
        INSERT INTO tattoos (title, category, hours, image_url, featured, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        tattoo.title,
        tattoo.category,
        tattoo.hours,
        tattoo.image_url,
        tattoo.featured,
        tattoo.sort_order,
      ]
    );
  }
}

function normalizeMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    throw new Error("Month must use YYYY-MM format.");
  }
  return month;
}

function normalizeDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }
  return date;
}

function normalizeReferences(references) {
  if (references === undefined || references === null) return [];
  if (!Array.isArray(references)) {
    throw new Error("References must be an array.");
  }

  return references
    .map((reference) => ({
      url: String(reference?.url || "").trim(),
      pathname: String(reference?.pathname || "").trim(),
    }))
    .filter((reference) => reference.url && reference.pathname);
}

async function deleteBlobReferences(references) {
  if (!Array.isArray(references)) return;

  for (const reference of references) {
    const pathname = String(reference?.pathname || "").trim();
    if (!pathname) continue;

    try {
      await del(pathname);
    } catch {
      // El archivo pudo haber sido borrado manualmente; no debe bloquear la limpieza de la cita.
    }
  }
}

export function normalizeSlots(slots) {
  if (!Array.isArray(slots)) {
    throw new Error("Slots must be an array.");
  }

  const uniqueSlots = [...new Set(slots.map((slot) => String(slot).trim()))];
  const validSlots = uniqueSlots.filter((slot) => /^\d{2}:\d{2}$/.test(slot));

  if (validSlots.length !== uniqueSlots.length) {
    throw new Error("Slots must use HH:MM format.");
  }

  return validSlots.sort();
}

export async function getAvailability(month) {
  await ensureSchema();
  const normalizedMonth = normalizeMonth(month);
  const result = await getPool().query(
    `
      SELECT to_char(date, 'YYYY-MM-DD') AS date, slots
      FROM availability
      WHERE date >= ($1 || '-01')::date
        AND date < (($1 || '-01')::date + interval '1 month')
      ORDER BY date ASC
    `,
    [normalizedMonth]
  );

  return result.rows.map((row) => ({
    date: row.date,
    slots: Array.isArray(row.slots) ? row.slots : [],
  }));
}

export async function getBookedSlots(month) {
  await ensureSchema();
  const normalizedMonth = normalizeMonth(month);
  const result = await getPool().query(
    `
      SELECT to_char(date, 'YYYY-MM-DD') AS date, time
      FROM appointments
      WHERE date >= ($1 || '-01')::date
        AND date < (($1 || '-01')::date + interval '1 month')
        AND status IN ('pending', 'confirmed')
      ORDER BY date ASC, time ASC
    `,
    [normalizedMonth]
  );

  return result.rows;
}

export async function setAvailability(date, slots) {
  await ensureSchema();
  const normalizedDate = normalizeDate(date);
  const normalizedSlots = normalizeSlots(slots);

  if (normalizedSlots.length === 0) {
    await getPool().query("DELETE FROM availability WHERE date = $1::date", [
      normalizedDate,
    ]);
    return { date: normalizedDate, slots: [] };
  }

  const result = await getPool().query(
    `
      INSERT INTO availability (date, slots)
      VALUES ($1::date, $2::jsonb)
      ON CONFLICT (date)
      DO UPDATE SET slots = EXCLUDED.slots
      RETURNING to_char(date, 'YYYY-MM-DD') AS date, slots
    `,
    [normalizedDate, JSON.stringify(normalizedSlots)]
  );

  return result.rows[0];
}

export async function createAppointment({
  name,
  email,
  phone,
  concept,
  date,
  time,
  references,
}) {
  await ensureSchema();
  const normalizedDate = normalizeDate(date);
  const normalizedTime = String(time || "").trim();
  const normalizedPhone = String(phone || "").trim();
  const normalizedReferences = normalizeReferences(references);

  if (!name?.trim() || !email?.trim() || !concept?.trim()) {
    throw new Error("Name, email and concept are required.");
  }

  if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
    throw new Error("Time must use HH:MM format.");
  }

  const availability = await getPool().query(
    "SELECT slots FROM availability WHERE date = $1::date",
    [normalizedDate]
  );

  const slots = availability.rows[0]?.slots || [];
  if (!slots.includes(normalizedTime)) {
    const error = new Error("Selected slot is not available.");
    error.code = "SLOT_UNAVAILABLE";
    throw error;
  }

  try {
    const token = randomUUID();
    const result = await getPool().query(
      `
        INSERT INTO appointments (name, email, phone, concept, date, time, token, reference_urls)
        VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8::jsonb)
        RETURNING id, name, email, concept, to_char(date, 'YYYY-MM-DD') AS date,
          phone, time, status, token, reference_urls, created_at
      `,
      [
        name.trim(),
        email.trim(),
        normalizedPhone || null,
        concept.trim(),
        normalizedDate,
        normalizedTime,
        token,
        JSON.stringify(normalizedReferences),
      ]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      error.code = "SLOT_BOOKED";
    }
    throw error;
  }
}

export async function listAppointments() {
  await ensureSchema();
  const result = await getPool().query(`
    SELECT id, name, email, concept, to_char(date, 'YYYY-MM-DD') AS date,
      phone, time, status, token, reference_urls, created_at
    FROM appointments
    ORDER BY date DESC, time DESC, created_at DESC
  `);

  return result.rows;
}

export async function listTattoos() {
  await ensureSchema();
  const result = await getPool().query(`
    SELECT id, title, category, hours, image_url, blob_path, featured,
      sort_order, created_at
    FROM tattoos
    ORDER BY sort_order ASC, created_at DESC, id DESC
  `);

  return result.rows;
}

export async function createTattoo({
  title,
  category,
  hours = "",
  featured = false,
  sort_order = 0,
  image_url,
  blob_path = null,
}) {
  await ensureSchema();

  if (!title?.trim() || !category?.trim() || !image_url?.trim()) {
    throw new Error("Title, category and image_url are required.");
  }

  const result = await getPool().query(
    `
      INSERT INTO tattoos
        (title, category, hours, image_url, blob_path, featured, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, category, hours, image_url, blob_path, featured,
        sort_order, created_at
    `,
    [
      title.trim(),
      category.trim(),
      String(hours || "").trim(),
      image_url.trim(),
      blob_path,
      Boolean(featured),
      Number.parseInt(sort_order, 10) || 0,
    ]
  );

  return result.rows[0];
}

export async function updateTattoo(id, fields) {
  await ensureSchema();
  const allowedFields = ["title", "category", "hours", "featured", "sort_order"];
  const entries = Object.entries(fields || {}).filter(([key]) =>
    allowedFields.includes(key)
  );

  if (entries.length === 0) {
    throw new Error("No valid tattoo fields to update.");
  }

  const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
  const values = entries.map(([key, value]) => {
    if (key === "featured") return Boolean(value);
    if (key === "sort_order") return Number.parseInt(value, 10) || 0;
    return String(value || "").trim();
  });

  const result = await getPool().query(
    `
      UPDATE tattoos
      SET ${assignments.join(", ")}
      WHERE id = $1
      RETURNING id, title, category, hours, image_url, blob_path, featured,
        sort_order, created_at
    `,
    [id, ...values]
  );

  if (!result.rows[0]) {
    const error = new Error("Tattoo not found.");
    error.code = "NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function deleteTattoo(id) {
  await ensureSchema();
  const result = await getPool().query(
    `
      DELETE FROM tattoos
      WHERE id = $1
      RETURNING id, title, image_url, blob_path
    `,
    [id]
  );

  if (!result.rows[0]) {
    const error = new Error("Tattoo not found.");
    error.code = "NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function updateAppointmentStatus(id, status) {
  await ensureSchema();
  const normalizedStatus = String(status || "").trim();
  const allowedStatuses = ["pending", "confirmed", "completed", "cancelled"];

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new Error("Invalid appointment status.");
  }

  const result = await getPool().query(
    `
      UPDATE appointments
      SET status = $2
      WHERE id = $1
      RETURNING id, name, email, phone, concept, to_char(date, 'YYYY-MM-DD') AS date,
        time, status, token, reference_urls, created_at
    `,
    [id, normalizedStatus]
  );

  if (!result.rows[0]) {
    const error = new Error("Appointment not found.");
    error.code = "NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function deleteAppointment(id) {
  await ensureSchema();
  const existing = await getPool().query(
    "SELECT reference_urls FROM appointments WHERE id = $1",
    [id]
  );

  if (!existing.rows[0]) {
    const error = new Error("Appointment not found.");
    error.code = "NOT_FOUND";
    throw error;
  }

  await deleteBlobReferences(existing.rows[0].reference_urls);

  const result = await getPool().query(
    "DELETE FROM appointments WHERE id = $1 RETURNING id",
    [id]
  );

  if (!result.rows[0]) {
    const error = new Error("Appointment not found.");
    error.code = "NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function purgeOldAppointments(months = 3) {
  await ensureSchema();
  const safeMonths = Math.max(1, Number.parseInt(months, 10) || 3);
  const expired = await getPool().query(
    `
      SELECT id, reference_urls
      FROM appointments
      WHERE status IN ('completed', 'cancelled')
        AND date < (CURRENT_DATE - ($1::int * interval '1 month'))
    `,
    [safeMonths]
  );

  for (const row of expired.rows) {
    await deleteBlobReferences(row.reference_urls);
  }

  const result = await getPool().query(
    `
      DELETE FROM appointments
      WHERE status IN ('completed', 'cancelled')
        AND date < (CURRENT_DATE - ($1::int * interval '1 month'))
      RETURNING id
    `,
    [safeMonths]
  );

  return result.rowCount;
}

export async function getAppointmentByToken(token) {
  await ensureSchema();
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    throw new Error("Token is required.");
  }

  const result = await getPool().query(
    `
      SELECT id, name, email, phone, concept, to_char(date, 'YYYY-MM-DD') AS date,
        time, status, token, reference_urls, created_at
      FROM appointments
      WHERE token = $1
      LIMIT 1
    `,
    [normalizedToken]
  );

  return result.rows[0] || null;
}
