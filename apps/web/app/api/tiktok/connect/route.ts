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

    // Store verifier in cookie for callback
    const cookieStore = await cookies();
    cookieStore.set("tiktok_code_verifier", verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10 // 10 minutes
    });

    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", clientKey);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "user.info.basic,video.upload,video.publish"
    );
    url.searchParams.set("state", "mutok");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");

    return NextResponse.json({ url: url.toString() });
  } catch (error) {
    console.error("Failed to generate TikTok auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate TikTok authorization URL" },
      { status: 500 }
    );
  }
}
