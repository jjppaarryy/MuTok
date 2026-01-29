import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { requireLocalRequest, maskSensitiveValue } from "../../../../lib/auth";
import { clearConfigCache, getConfig } from "../../../../lib/config";

const ENV_KEYS = [
  "TIKTOK_CLIENT_ID",
  "TIKTOK_CLIENT_SECRET",
  "TIKTOK_REDIRECT_URI",
  "OPENAI_API_KEY"
] as const;

const SENSITIVE_KEYS: readonly string[] = ["TIKTOK_CLIENT_SECRET", "OPENAI_API_KEY"];

type EnvKey = (typeof ENV_KEYS)[number];
type EnvValues = Record<EnvKey, string>;
type MaskedEnvValues = Record<EnvKey, { value: string; masked: boolean; hasValue: boolean }>;

const envPath = () => path.join(process.cwd(), ".env.local");

const updateEnvFile = async (updates: Partial<EnvValues>) => {
  const file = envPath();
  const existing = await readFile(file, "utf8").catch(() => "");
  const lines = existing ? existing.split(/\r?\n/) : [];
  const touched = new Set<EnvKey>();
  const nextLines: string[] = [];

  for (const line of lines) {
    const [rawKey] = line.split("=");
    const key = rawKey?.trim() as EnvKey;
    if (!ENV_KEYS.includes(key) || !(key in updates)) {
      if (line.trim()) nextLines.push(line);
      continue;
    }
    touched.add(key);
    const value = updates[key];
    if (typeof value === "string" && value.length > 0) {
      nextLines.push(`${key}=${value}`);
    }
  }

  for (const key of ENV_KEYS) {
    if (touched.has(key)) continue;
    const value = updates[key];
    if (typeof value === "string" && value.length > 0) {
      nextLines.push(`${key}=${value}`);
    }
  }

  await writeFile(file, `${nextLines.join("\n")}\n`, "utf8");
};

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const response = {} as MaskedEnvValues;
    
    for (const key of ENV_KEYS) {
      const val = await getConfig(key);
      const isSensitive = SENSITIVE_KEYS.includes(key);
      
      response[key] = {
        value: isSensitive ? maskSensitiveValue(val) : (val ?? ""),
        masked: isSensitive,
        hasValue: Boolean(val)
      };
    }

    return NextResponse.json({ values: response });
  } catch (error) {
    console.error("Failed to read config:", error);
    return NextResponse.json(
      { error: "Failed to read environment configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as Partial<EnvValues>;
    
    // Validate that we're not receiving masked values back
    for (const key of SENSITIVE_KEYS) {
      const value = body[key as EnvKey];
      if (value && value.startsWith("****")) {
        // Don't update if the value is masked (user didn't change it)
        delete body[key as EnvKey];
      }
    }
    
    await updateEnvFile(body);
    clearConfigCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update env file:", error);
    return NextResponse.json(
      { error: "Failed to update environment configuration" },
      { status: 500 }
    );
  }
}
