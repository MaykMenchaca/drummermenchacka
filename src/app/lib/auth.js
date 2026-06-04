import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "drummer_admin";
const SESSION_VALUE = "admin";

function getSecret() {
  return process.env.ADMIN_PASSWORD || "172003";
}

function sign(value) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
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
