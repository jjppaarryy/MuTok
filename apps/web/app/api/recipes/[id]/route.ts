import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

type RecipePatch = {
  name?: string;
  beat1Text?: string;
  beat2Text?: string;
  captionText?: string;
  ctaType?: string;
  allowedSnippetTypes?: string[];
  containerAllowed?: "static_daw" | "montage" | "both";
  enabled?: boolean;
};

const resolveDisallowedContainers = (allowed?: RecipePatch["containerAllowed"]) => {
  if (!allowed || allowed === "both") return [];
  return allowed === "static_daw" ? ["montage"] : ["static_daw"];
};

const toTemplateArray = (text?: string) => {
  const value = (text ?? "").trim();
  return value ? [value] : [];
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let body: RecipePatch;
  try {
    body = (await request.json()) as RecipePatch;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const data: Record<string, unknown> = {};
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9c8b0390-3224-46f9-ad38-b2bfefc20de7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recipes/[id]/route.ts:18',message:'recipes PATCH input',data:{id,keys:Object.keys(body)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion agent log

  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.beat1Text === "string") data.beat1Templates = toTemplateArray(body.beat1Text);
  if (typeof body.beat2Text === "string") data.beat2Templates = toTemplateArray(body.beat2Text);
  if (typeof body.captionText === "string") data.captionTemplate = body.captionText.trim();
  if (typeof body.ctaType === "string") data.ctaType = body.ctaType;
  if (Array.isArray(body.allowedSnippetTypes)) data.allowedSnippetTypes = body.allowedSnippetTypes;
  if (typeof body.containerAllowed === "string") {
    data.disallowedContainers = resolveDisallowedContainers(body.containerAllowed);
  }
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;

  try {
    const recipe = await prisma.hookRecipe.update({ where: { id }, data });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9c8b0390-3224-46f9-ad38-b2bfefc20de7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recipes/[id]/route.ts:31',message:'recipes PATCH saved',data:{id,updated:Object.keys(data)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion agent log
    return NextResponse.json({ recipe });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2002" || (err.message && err.message.includes("Unique constraint"))) {
      return NextResponse.json(
        { error: "A hook with this name already exists. Use a different name." },
        { status: 400 }
      );
    }
    const message = e instanceof Error ? (e as Error).message : "Update failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
