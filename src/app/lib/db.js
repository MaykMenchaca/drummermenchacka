import pg from "pg";

const { Pool } = pg;

let pool;
let schemaReady = false;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
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
      concept TEXT NOT NULL,
      date DATE NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT appointments_status_check
        CHECK (status IN ('pending', 'confirmed', 'cancelled'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_idx
      ON appointments (date, time)
      WHERE status IN ('pending', 'confirmed');
  `);

  schemaReady = true;
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

export async function createAppointment({ name, email, concept, date, time }) {
  await ensureSchema();
  const normalizedDate = normalizeDate(date);
  const normalizedTime = String(time || "").trim();

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
    const result = await getPool().query(
      `
        INSERT INTO appointments (name, email, concept, date, time)
        VALUES ($1, $2, $3, $4::date, $5)
        RETURNING id, name, email, concept, to_char(date, 'YYYY-MM-DD') AS date,
          time, status, created_at
      `,
      [
        name.trim(),
        email.trim(),
        concept.trim(),
        normalizedDate,
        normalizedTime,
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
      time, status, created_at
    FROM appointments
    ORDER BY date DESC, time DESC, created_at DESC
  `);

  return result.rows;
}
