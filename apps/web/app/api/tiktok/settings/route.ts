import { NextRequest, NextResponse } from "next/server";
import { getTikTokSettings, setTikTokSettings } from "../../../../lib/tiktokSettings";
import { requireLocalRequest } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const settings = await getTikTokSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to get TikTok settings:", error);
    return NextResponse.json(
      { error: "Failed to get TikTok settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({})) as {
      sandbox?: boolean;
      export_defaults?: {
        caption?: string;
        visibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
        allowComment?: boolean;
        allowDuet?: boolean;
        allowStitch?: boolean;
        brandedContent?: boolean;
        promoteYourself?: boolean;
      };
    };

    // Validate visibility if provided
    if (body.export_defaults?.visibility) {
      const validVisibilities = ["PUBLIC", "FRIENDS", "PRIVATE"];
      if (!validVisibilities.includes(body.export_defaults.visibility)) {
        return NextResponse.json(
          { error: `Invalid visibility. Must be one of: ${validVisibilities.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const current = await getTikTokSettings();
    const updated = await setTikTokSettings({
      sandbox: Boolean(body.sandbox ?? current.sandbox),
      export_defaults: {
        ...current.export_defaults,
        ...(body.export_defaults ?? {})
      }
    });
    return NextResponse.json(updated.valueJson);
  } catch (error) {
    console.error("Failed to update TikTok settings:", error);
    return NextResponse.json(
      { error: "Failed to update TikTok settings" },
      { status: 500 }
    );
  }
}
