import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "../../../../lib/tiktokAuth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const verifier = cookieStore.get("tiktok_code_verifier")?.value;
    const savedState = cookieStore.get("tiktok_state")?.value;
    const returnedState = searchParams.get("state");
    
    console.log("[callback] Code:", code.slice(0, 20) + "...");
    console.log("[callback] Full verifier from cookie:", verifier);
    console.log("[callback] Verifier length:", verifier?.length);
    console.log("[callback] Saved state:", savedState);
    console.log("[callback] Returned state:", returnedState);
    
    if (!verifier) {
      console.error("[callback] No verifier cookie found!");
      return NextResponse.json(
        { error: "Session expired. Please try connecting again." },
        { status: 400 }
      );
    }
    
    await exchangeCode(code, verifier);
    
    // Clear the verifier cookie
    cookieStore.delete("tiktok_code_verifier");

    return NextResponse.redirect(new URL("/connect?connected=1", request.url));
  } catch (error) {
    console.error("[callback] Token exchange error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token exchange failed" },
      { status: 500 }
    );
  }
}
