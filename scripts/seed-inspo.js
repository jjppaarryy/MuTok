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
      // Check if already exists by sourceId
      const existing = await prisma.inspoItem.findFirst({
        where: {
          source: "notion",
          sourceId: item.notion_row_id
        }
      });

      if (existing) {
        console.log(`  Skipping ${item.notion_row_id} (already exists)`);
        skipped++;
        continue;
      }

      // Map fields to InspoItem schema
      const inspoItem = {
        source: "notion",
        sourceId: item.notion_row_id,
        title: item.title,
        contentType: item.content_type,
        assetType: item.asset_type,
        linkOriginal: item.link_original || null,
        copyRewrite: item.copy,
        whyItWorks: item.why_it_works,
        description: item.description,
        howToUse: item.how_to_use,
        themeTags: item.theme ? [item.theme] : [],
        purposeTags: item.purpose ? [item.purpose] : [],
        genreTags: item.genre ? [item.genre] : [],
        hashtags: item.hashtags || [],
        stats: {
          views: item.metrics_views || 0,
          likes: item.metrics_likes || 0,
          comments: item.metrics_comments || 0,
          shares: item.metrics_shares || 0
        },
        seedPatterns: {
          copyTemplate: item.copy_template,
          isActive: item.is_active !== false
        },
        favorite: false
      };

      await prisma.inspoItem.create({ data: inspoItem });
      console.log(`  Imported: ${item.title}`);
      imported++;
    } catch (error) {
      console.error(`  Error importing ${item.notion_row_id}:`, error.message);
      errors.push({ id: item.notion_row_id, error: error.message });
    }
  }

  // Log the import
  await prisma.inspoImportLog.create({
    data: {
      source: "notion",
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
