import { NextResponse } from "next/server";
import { isAdmin } from "@/app/lib/auth";
import { deleteAppointment, updateAppointmentStatus } from "@/app/lib/db";

function getId(params) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid appointment id.");
  }
  return id;
}

export async function PATCH(request, { params }) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const id = getId(await params);
    const body = await request.json().catch(() => ({}));
    const appointment = await updateAppointmentStatus(id, body.status);
    return NextResponse.json({ appointment });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "NOT_FOUND" ? 404 : 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const id = getId(await params);
    await deleteAppointment(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "NOT_FOUND" ? 404 : 400 }
    );
  }
}
