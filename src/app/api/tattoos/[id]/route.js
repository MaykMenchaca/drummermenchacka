import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { isAdmin } from "@/app/lib/auth";
import { deleteTattoo, updateTattoo } from "@/app/lib/db";

export const runtime = "nodejs";

function getId(params) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid tattoo id.");
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
    const tattoo = await updateTattoo(id, body);
    return NextResponse.json({ tattoo });
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
    const tattoo = await deleteTattoo(id);

    if (tattoo.blob_path) {
      await del(tattoo.blob_path);
    }

    return NextResponse.json({ deleted: true, tattoo });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "NOT_FOUND" ? 404 : 400 }
    );
  }
}
