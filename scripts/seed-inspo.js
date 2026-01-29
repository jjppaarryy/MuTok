/**
 * Seed script to import Inspo data into the database
 * Run with: node scripts/seed-inspo.js
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, "inspo-seed-data.json");
  const rawData = fs.readFileSync(dataPath, "utf8");
  const items = JSON.parse(rawData);

  console.log(`Found ${items.length} items to import...`);

  let imported = 0;
  let skipped = 0;
  let errors = [];

  for (const item of items) {
    try {
      const source = item.source;
      if (!source) {
        console.log("  Skipping item (missing source)");
        skipped++;
        continue;
      }
      const sourceId = item.sourceId || null;

      const existing = sourceId
        ? await prisma.inspoItem.findFirst({ where: { source, sourceId } })
        : null;

      const seedFromVoicebank =
        item.beat1 && item.beat2
          ? [
              {
                core_mechanic: item.sourceId || item.hook_family || "voicebank",
                hook_family: item.hook_family || "voicebank",
                music_first_variants: [
                  {
                    beat1: item.beat1,
                    beat2: item.beat2,
                    caption: item.full_copy || item.copyRewrite || null
                  }
                ]
              }
            ]
          : null;

      const seedPatterns =
        Array.isArray(item.seedPatterns) && item.seedPatterns.length
          ? item.seedPatterns
          : seedFromVoicebank;

      const inspoItem = {
        source,
        sourceId,
        title: item.title || sourceId,
        contentType: item.contentType || null,
        assetType: item.assetType || null,
        linkOriginal: item.linkOriginal || null,
        copyRewrite: item.full_copy || item.copyRewrite || item.copy || null,
        whyItWorks: item.whyItWorks || null,
        description: item.description || null,
        howToUse: item.howToUse || null,
        themeTags: Array.isArray(item.themeTags) && item.themeTags.length ? item.themeTags : null,
        purposeTags:
          Array.isArray(item.purposeTags) && item.purposeTags.length ? item.purposeTags : null,
        genreTags: Array.isArray(item.genreTags) && item.genreTags.length ? item.genreTags : null,
        hashtags: Array.isArray(item.hashtags) && item.hashtags.length ? item.hashtags : null,
        stats: item.stats || null,
        seedPatterns,
        favorite: false
      };

      if (existing) {
        await prisma.inspoItem.update({ where: { id: existing.id }, data: inspoItem });
        console.log(`  Updated: ${sourceId ?? existing.id}`);
        imported++;
        continue;
      }

      await prisma.inspoItem.create({ data: inspoItem });
      console.log(`  Imported: ${sourceId ?? item.title ?? "inspo item"}`);
      imported++;
    } catch (error) {
      console.error(`  Error importing ${item.sourceId ?? "unknown"}:`, error.message);
      errors.push({ id: item.sourceId ?? "unknown", error: error.message });
    }
  }

  // Log the import
  await prisma.inspoImportLog.create({
    data: {
      source: items[0]?.source ?? null,
      rawJson: { itemCount: items.length },
      imported,
      skipped,
      errors: errors.length > 0 ? errors : null
    }
  });

  console.log("\n--- Import Summary ---");
  console.log(`Total items: ${items.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors.length}`);
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
