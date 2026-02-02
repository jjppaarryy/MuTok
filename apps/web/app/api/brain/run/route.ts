import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Brain runs are disabled. Hooks are now fixed and deterministic." },
    { status: 410 }
  );
}
