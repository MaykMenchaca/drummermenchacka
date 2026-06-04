import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_REFERENCE_BYTES,
      }),
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
