import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { isAdmin } from "@/app/lib/auth";
import { createTattoo, listTattoos } from "@/app/lib/db";

export const runtime = "nodejs";

const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 80;

function parseBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function safeFileName(name) {
  return String(name || "tattoo")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function GET() {
  try {
    const tattoos = await listTattoos();
    return NextResponse.json({ tattoos });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const hours = String(formData.get("hours") || "").trim();
    const featured = parseBoolean(formData.get("featured"));
    const sort_order = Number.parseInt(formData.get("sort_order"), 10) || 0;

    if (!image || typeof image.arrayBuffer !== "function") {
      return NextResponse.json({ error: "La imagen es obligatoria." }, { status: 400 });
    }

    if (!title || !category) {
      return NextResponse.json(
        { error: "Titulo y categoria son obligatorios." },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await image.arrayBuffer());
    const optimizedImage = await sharp(inputBuffer)
      .rotate()
      .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    const blobPath = `tattoos/${Date.now()}-${safeFileName(image.name)}.jpg`;
    const blob = await put(blobPath, optimizedImage, {
      access: "public",
      contentType: "image/jpeg",
    });

    const tattoo = await createTattoo({
      title,
      category,
      hours,
      featured,
      sort_order,
      image_url: blob.url,
      blob_path: blob.pathname || blobPath,
    });

    return NextResponse.json({ tattoo }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
