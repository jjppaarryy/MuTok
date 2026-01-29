import { NextRequest, NextResponse } from "next/server";
import { requireLocalRequest } from "../../../../lib/auth";
import { getConfig } from "../../../../lib/config";
import { generateCodeVerifier, generateCodeChallenge } from "../../../../lib/pkce";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const clientKey = await getConfig("TIKTOK_CLIENT_ID");
    const redirectUri = await getConfig("TIKTOK_REDIRECT_URI");

    if (!clientKey || !redirectUri) {
      return NextResponse.json(
        { error: "Missing TikTok OAuth configuration. Please configure your TikTok credentials in Settings." },
        { status: 400 }
      );
    }

    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const stateId = `mutok_${Date.now()}`;

    // Clear any old verifier and store new one
    const cookieStore = await cookies();
    cookieStore.delete("tiktok_code_verifier");
    cookieStore.delete("tiktok_state");
    
    cookieStore.set("tiktok_code_verifier", verifier, {
      httpOnly: true,
      secure: false, // localhost doesn't use HTTPS
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/"
    });
    
    cookieStore.set("tiktok_state", stateId, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/"
    });

    console.log("[connect] Full verifier:", verifier);
    console.log("[connect] Verifier length:", verifier.length);
    console.log("[connect] Full challenge:", challenge);
    console.log("[connect] Challenge length:", challenge.length);
    console.log("[connect] State:", stateId);

    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", clientKey);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "user.info.basic,video.publish"
    );
    url.searchParams.set("state", stateId);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");

    const finalUrl = url.toString();
    console.log("[connect] Final auth URL challenge param:", url.searchParams.get("code_challenge"));
    
    return NextResponse.json({ url: finalUrl });
  } catch (error) {
    console.error("Failed to generate TikTok auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate TikTok authorization URL" },
      { status: 500 }
    );
  }
}
