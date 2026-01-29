/**
 * Seed InspoItems into HookRecipes/Variants via API.
 * Requires the web server running (default http://localhost:3000).
 * Run with: node scripts/seed-inspo-recipes.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getBaseUrl = () => process.env.SEED_BASE_URL || "http://localhost:3000";

async function seedInspo(id) {
  const url = `${getBaseUrl()}/api/inspo/${id}/seed`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "patterns" })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Seed failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function main() {
  const baseUrl = getBaseUrl();
  console.log(`Seeding inspo items via ${baseUrl}...`);

  const inspoItems = await prisma.inspoItem.findMany({
    where: { seedPatterns: { not: null } },
    select: { id: true, source: true, sourceId: true }
  });

  const recipes = await prisma.hookRecipe.findMany({
    where: { inspoItemId: { in: inspoItems.map((item) => item.id) } },
    select: { inspoItemId: true }
  });
  const seededIds = new Set(recipes.map((recipe) => recipe.inspoItemId).filter(Boolean));

  let seeded = 0;
  let skipped = 0;
  const errors = [];

  for (const item of inspoItems) {
    if (seededIds.has(item.id)) {
      console.log(`  Skipping ${item.sourceId ?? item.id} (already seeded)`);
      skipped += 1;
      continue;
    }
    try {
      const result = await seedInspo(item.id);
      console.log(
        `  Seeded ${item.sourceId ?? item.id}: recipes=${result.createdRecipeIds?.length ?? 0}`
      );
      seeded += 1;
    } catch (error) {
      console.error(`  Error seeding ${item.sourceId ?? item.id}:`, error.message);
      errors.push({ id: item.sourceId ?? item.id, error: error.message });
    }
  }

  console.log("\n--- Seed Summary ---");
  console.log(`Total inspo items: ${inspoItems.length}`);
  console.log(`Seeded: ${seeded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("Errors:", errors);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
