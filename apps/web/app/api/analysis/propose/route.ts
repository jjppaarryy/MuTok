import { NextResponse } from "next/server";
import { proposeRecipes } from "../../../../lib/recipeSuggestions";

export async function POST() {
  try {
    const suggestions = await proposeRecipes();
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
