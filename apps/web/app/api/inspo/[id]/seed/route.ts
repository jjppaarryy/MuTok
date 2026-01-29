import { NextResponse } from "next/server";
import { seedInspoItem } from "../../../../../lib/inspoSeed";

type Params = { params: Promise<{ id: string }> };

type SeedMode = "patterns" | "variants";

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    mode?: SeedMode;
    targetGenre?: string;
    containerPrefs?: string[];
  };
  const result = await seedInspoItem({
    inspoId: id,
    mode: body.mode
  });

  return NextResponse.json({ ...result, mode: body.mode ?? "patterns" });
}
