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
    
    await exchangeCode(code, verifier);
    
    // Clear the verifier cookie
    cookieStore.delete("tiktok_code_verifier");

    return NextResponse.redirect(new URL("/connect?connected=1", request.url));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token exchange failed" },
      { status: 500 }
    );
  }
}
