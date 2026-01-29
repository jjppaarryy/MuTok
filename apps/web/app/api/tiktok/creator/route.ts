import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createTikTokClient } from "../../../../../../packages/core/src/tiktok";
import { getValidAccessToken } from "../../../../lib/tiktokAuth";
import { getTikTokSettings } from "../../../../lib/tiktokSettings";

export async function GET() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const settings = await getTikTokSettings();
  const client = createTikTokClient({
    accessToken,
    sandbox: settings.sandbox
  });

  const creatorInfo = await client.getCreatorInfo();
  return NextResponse.json({ creatorInfo });
}
