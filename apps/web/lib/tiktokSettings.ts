import { prisma } from "./prisma";

export type TikTokSettings = {
  sandbox: boolean;
  export_defaults: {
    caption: string;
    visibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
    allowComment: boolean;
    allowDuet: boolean;
    allowStitch: boolean;
    brandedContent: boolean;
    promoteYourself: boolean;
  };
  upload_cooldown_until?: string | null;
};

export const defaultTikTokSettings: TikTokSettings = {
  sandbox: true,
  export_defaults: {
    caption: "",
    visibility: "PUBLIC",
    allowComment: true,
    allowDuet: true,
    allowStitch: true,
    brandedContent: false,
    promoteYourself: false
  },
  upload_cooldown_until: null
};

export async function getTikTokSettings(): Promise<TikTokSettings> {
  const stored = await prisma.setting.findUnique({
    where: { key: "tiktok" }
  });
  if (!stored) {
    return defaultTikTokSettings;
  }
  return { ...defaultTikTokSettings, ...(stored.valueJson as TikTokSettings) };
}

export async function setTikTokSettings(settings: TikTokSettings) {
  return prisma.setting.upsert({
    where: { key: "tiktok" },
    update: { valueJson: settings },
    create: { key: "tiktok", valueJson: settings }
  });
}

export async function setCooldown(hours: number) {
  const current = await getTikTokSettings();
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  return setTikTokSettings({ ...current, upload_cooldown_until: until });
}

export async function getCooldown() {
  const current = await getTikTokSettings();
  return current.upload_cooldown_until
    ? new Date(current.upload_cooldown_until)
    : null;
}

export async function isCooldownActive() {
  const until = await getCooldown();
  if (!until) return false;
  return until.getTime() > Date.now();
}
