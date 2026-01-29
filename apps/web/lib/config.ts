import { readFile } from "fs/promises";
import path from "path";

const ENV_KEYS = [
  "TIKTOK_CLIENT_ID",
  "TIKTOK_CLIENT_SECRET",
  "TIKTOK_REDIRECT_URI",
  "OPENAI_API_KEY"
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

let envCache: Record<string, string> | null = null;

async function loadEnvFile(): Promise<Record<string, string>> {
  if (envCache) return envCache;

  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const content = await readFile(envPath, "utf8");
    const lines = content.split(/\r?\n/);
    const config: Record<string, string> = {};
    
    for (const line of lines) {
      if (!line || line.trim().startsWith("#")) continue;
      const [rawKey, ...rest] = line.split("=");
      const key = rawKey?.trim();
      if (key) {
        config[key] = rest.join("=").trim();
      }
    }
    
    envCache = config;
    return config;
  } catch (error) {
    return {};
  }
}

export async function getConfig(key: EnvKey): Promise<string | undefined> {
  // Check process.env first
  const val = process.env[key];
  if (val) return val;

  // Fallback to reading file
  const config = await loadEnvFile();
  return config[key];
}

export async function requireConfig(key: EnvKey): Promise<string> {
  const val = await getConfig(key);
  if (!val) {
    throw new Error(`Missing required configuration: ${key}. Please configure it in Settings.`);
  }
  return val;
}

export function clearConfigCache() {
  envCache = null;
}
