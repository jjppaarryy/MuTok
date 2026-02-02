import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireLocalRequest } from "../../../../../../lib/auth";
import {
  measureSegmentEnergy,
  toEnergyScore,
  hasMoment
} from "../../../../../../../../packages/core/src/audio";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    
    // Validate ID format
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid track ID format" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({})) as {
      durationSec?: number;
      replaceExisting?: boolean;
      startSec?: number;
      section?: string | null;
    };

    if (typeof body.startSec === "number" && typeof body.durationSec === "number") {
      // Validate input values
      if (body.startSec < 0 || body.durationSec <= 0 || body.durationSec > 60) {
        return NextResponse.json(
          { error: "Invalid startSec or durationSec. Duration must be between 0 and 60 seconds." },
          { status: 400 }
        );
      }

      const track = await prisma.track.findUnique({ where: { id } });
      if (!track) {
        return NextResponse.json({ error: "Track not found" }, { status: 404 });
      }

      // Measure energy with error handling
      let energy;
      try {
        energy = await measureSegmentEnergy({
          inputPath: track.filePath,
          startSec: body.startSec,
          durationSec: body.durationSec
        });
      } catch (energyError) {
        console.error("Failed to measure segment energy:", energyError);
        // Use default values if energy measurement fails
        energy = { meanDb: -25, maxDb: -10 };
      }

      const moment3Start = body.startSec + 3;
      const moment7Start = body.startSec + 7;
      
      let moment3Energy = null;
      let moment7Energy = null;
      
      try {
        if (body.durationSec >= 5) {
          moment3Energy = await measureSegmentEnergy({
            inputPath: track.filePath,
            startSec: moment3Start,
            durationSec: Math.min(2, body.durationSec - 3)
          });
        }
        if (body.durationSec >= 9) {
          moment7Energy = await measureSegmentEnergy({
            inputPath: track.filePath,
            startSec: moment7Start,
            durationSec: Math.min(2, body.durationSec - 7)
          });
        }
      } catch (momentError) {
        console.error("Failed to measure moment energy:", momentError);
        // Continue without moment data
      }

      const energyScore = toEnergyScore(energy.meanDb, energy.maxDb);
      const snippet = await prisma.snippet.create({
        data: {
          trackId: id,
          startSec: body.startSec,
          durationSec: body.durationSec,
          energyScore,
          section: typeof body.section === "string" ? body.section : null,
          moment3to7: moment3Energy ? hasMoment(moment3Energy.meanDb, moment3Energy.maxDb) : false,
          moment7to11: moment7Energy ? hasMoment(moment7Energy.meanDb, moment7Energy.maxDb) : false,
          approved: true
        }
      });

      return NextResponse.json({ snippets: [snippet] });
    }

    const track = await prisma.track.findUnique({
      where: { id }
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Missing startSec and durationSec. Use manual selection." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to create snippet:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create snippet" },
      { status: 500 }
    );
  }
}
