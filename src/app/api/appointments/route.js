import { NextResponse } from "next/server";
import { isAdmin } from "@/app/lib/auth";
import { createAppointment, listAppointments } from "@/app/lib/db";
import {
  MEXICAN_WHATSAPP_ERROR,
  normalizeMexicanWhatsApp,
} from "@/app/lib/phone";

export async function GET(request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const appointments = await listAppointments();
    return NextResponse.json({ appointments });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const normalizedPhone = normalizeMexicanWhatsApp(body.phone);

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: MEXICAN_WHATSAPP_ERROR },
        { status: 400 }
      );
    }

    const appointment = await createAppointment({
      name: body.name,
      email: body.email,
      phone: normalizedPhone,
      concept: body.concept,
      date: body.date,
      time: body.time,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    if (error.code === "SLOT_BOOKED" || error.code === "SLOT_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
