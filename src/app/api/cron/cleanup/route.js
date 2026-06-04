import { NextResponse } from "next/server";
import { purgeOldAppointments } from "@/app/lib/db";

export async function GET(request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";

  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  if (authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const deleted = await purgeOldAppointments(3);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
