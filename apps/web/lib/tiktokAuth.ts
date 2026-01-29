import { prisma } from "./prisma";
import { requireConfig } from "./config";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope?: string;
};

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

async function exchangeToken(params: Record<string, string>) {
  console.log("[tiktokAuth] Exchanging token with params:", Object.keys(params));
  console.log("[tiktokAuth] code_verifier:", params.code_verifier?.slice(0, 20) + "...");
  console.log("[tiktokAuth] code_verifier length:", params.code_verifier?.length);
  
  const body = new URLSearchParams(params).toString();
  console.log("[tiktokAuth] Request body (partial):", body.slice(0, 200) + "...");
  
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const text = await response.text();
  console.log("[tiktokAuth] Response status:", response.status);
  console.log("[tiktokAuth] Response body:", text);

  if (!response.ok) {
    throw new Error(`TikTok token error: ${text}`);
  }

  const json = JSON.parse(text) as TokenResponse & { error?: string; error_description?: string };
  if (json.error) {
    throw new Error(`TikTok error: ${json.error} - ${json.error_description}`);
  }
  if (!json.access_token) {
    throw new Error("Missing access_token in response");
  }
  return json;
}

export async function saveTokens(data: TokenResponse) {
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  const scopes = data.scope ?? "";

  await prisma.tikTokAuth.deleteMany();
  return prisma.tikTokAuth.create({
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scopes,
      openId: data.open_id
    }
  });
}

export async function exchangeCode(code: string, codeVerifier?: string) {
  const clientKey = await requireConfig("TIKTOK_CLIENT_ID");
  const clientSecret = await requireConfig("TIKTOK_CLIENT_SECRET");
  const redirectUri = await requireConfig("TIKTOK_REDIRECT_URI");

  const params: Record<string, string> = {
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  };

  if (codeVerifier) {
    params.code_verifier = codeVerifier;
  }

  const data = await exchangeToken(params);

  return saveTokens(data);
}

export async function refreshAccessToken(refreshToken: string) {
  const clientKey = await requireConfig("TIKTOK_CLIENT_ID");
  const clientSecret = await requireConfig("TIKTOK_CLIENT_SECRET");

  const data = await exchangeToken({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  return saveTokens(data);
}

export async function getValidAccessToken() {
  const auth = await prisma.tikTokAuth.findFirst();
  if (!auth) {
    return null;
  }
  if (auth.expiresAt > new Date(Date.now() + 60 * 1000)) {
    return auth.accessToken;
  }
  const refreshed = await refreshAccessToken(auth.refreshToken);
  return refreshed.accessToken;
}
