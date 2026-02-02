import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "../../../../lib/tiktokAuth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error_description") ?? searchParams.get("error");

    const redirectToConnect = (message?: string) => {
      try {
        const url = request.nextUrl.clone();
        url.pathname = "/connect";
        url.search = "";
        if (message) {
          url.searchParams.set("error", message);
        }
        return NextResponse.redirect(url);
      } catch (error) {
        return NextResponse.json(
          { error: message ?? "TikTok connect failed", detail: error instanceof Error ? error.message : String(error) },
          { status: 200 }
        );
      }
    };

    const redirectToConnected = () => {
      try {
        const url = request.nextUrl.clone();
        url.pathname = "/connect";
        url.search = "";
        url.searchParams.set("connected", "1");
        return NextResponse.redirect(url);
      } catch (error) {
        return NextResponse.json(
          { ok: true, detail: error instanceof Error ? error.message : String(error) },
          { status: 200 }
        );
      }
    };

    if (errorParam) {
      return redirectToConnect(errorParam);
    }

    if (!code) {
      return redirectToConnect("Missing code from TikTok.");
    }

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
      return redirectToConnect("Session expired. Please try connecting again.");
    }

    if (savedState && returnedState && savedState !== returnedState) {
      return redirectToConnect("Security check failed. Please try connecting again.");
    }

    await exchangeCode(code, verifier);

    cookieStore.delete("tiktok_code_verifier");
    return redirectToConnected();
  } catch (error) {
    console.error("[callback] Token exchange error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token exchange failed" },
      { status: 200 }
    );
  }
}
