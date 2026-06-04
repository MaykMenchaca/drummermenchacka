import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "drummer_admin";
const SESSION_VALUE = "admin";

// La contraseña del admin es obligatoria en producción. En desarrollo, si no se
// configuró, se usa un valor local de conveniencia (nunca llega a producción).
function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_PASSWORD no está configurada.");
    }
    return "172003";
  }
  return password;
}

function getSecret() {
  return getAdminPassword();
}

function sign(value) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

// Comparación en tiempo constante de la contraseña ingresada.
export function verifyPassword(input) {
  const expected = getAdminPassword();
  const inputBuffer = Buffer.from(String(input ?? ""));
  const expectedBuffer = Buffer.from(expected);
  if (inputBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(inputBuffer, expectedBuffer);
}

export function createSessionCookie() {
  const signature = sign(SESSION_VALUE);
  return `${SESSION_VALUE}.${signature}`;
}

export function isValidSession(value) {
  if (!value || !value.includes(".")) return false;

  const [session, signature] = value.split(".");
  if (session !== SESSION_VALUE || !signature) return false;

  const expected = sign(session);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

export function isAdmin(request) {
  return isValidSession(request.cookies.get(COOKIE_NAME)?.value);
}

export function setAdminCookie(response) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: createSessionCookie(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearAdminCookie(response) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
