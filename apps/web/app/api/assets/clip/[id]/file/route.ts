import { NextRequest } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { validateFilePath, requireLocalRequest } from "../../../../../../lib/auth";
import fs from "fs";
import { stat } from "fs/promises";
import path from "path";

const getContentType = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  return "application/octet-stream";
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return new Response("Invalid ID format", { status: 400 });
    }

    const clip = await prisma.clip.findUnique({ where: { id } });
    if (!clip?.filePath) {
      return new Response("Not found", { status: 404 });
    }

    const safePath = validateFilePath(clip.filePath);
    if (!safePath || !fs.existsSync(safePath)) {
      return new Response("Not found", { status: 404 });
    }

    const range = request.headers.get("range");
    const fileStat = await stat(safePath);
    const fileSize = fileStat.size;
    const contentType = getContentType(safePath);

    if (!range) {
      const stream = fs.createReadStream(safePath);
      return new Response(stream as unknown as ReadableStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store"
        }
      });
    }

    const bytesPrefix = "bytes=";
    if (!range.startsWith(bytesPrefix)) {
      return new Response("Bad range", { status: 416 });
    }

    const [startStr, endStr] = range.slice(bytesPrefix.length).split("-");
    const start = Number(startStr);
    const end = endStr ? Number(endStr) : fileSize - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize) {
      return new Response("Bad range", { status: 416 });
    }

    const stream = fs.createReadStream(safePath, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Error serving clip file:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
