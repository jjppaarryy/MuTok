import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "..", "data");

export async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

export async function saveFile(
  fileBuffer: Buffer,
  subfolder: "clips" | "tracks",
  filename: string
) {
  const baseDir = await ensureDataDir();
  const folder = path.join(baseDir, subfolder);
  await mkdir(folder, { recursive: true });
  const filePath = path.join(folder, filename);
  await writeFile(filePath, fileBuffer);
  return filePath;
}

export async function deleteFile(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    // Ignore missing file errors.
  }
}
