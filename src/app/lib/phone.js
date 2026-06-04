export const MEXICAN_WHATSAPP_ERROR =
  "Escribe tu WhatsApp con lada de Mexico: +52 y 10 digitos.";

export function normalizeMexicanWhatsApp(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const nationalNumber = digits.startsWith("52") ? digits.slice(2) : digits;

  if (!/^[1-9]\d{9}$/.test(nationalNumber)) {
    return "";
  }

  return `+52${nationalNumber}`;
}
