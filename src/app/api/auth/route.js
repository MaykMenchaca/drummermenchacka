import { NextResponse } from "next/server";
import { clearAdminCookie, isAdmin, setAdminCookie, verifyPassword } from "@/app/lib/auth";

export async function GET(request) {
  return NextResponse.json({ authenticated: isAdmin(request) });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || "");

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  setAdminCookie(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  clearAdminCookie(response);
  return response;
}
