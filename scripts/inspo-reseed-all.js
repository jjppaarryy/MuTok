const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {
  const items = await prisma.inspoItem.findMany();
  if (items.length === 0) {
    console.log("No inspo items found.");
    return;
  }

  await prisma.variant.deleteMany({ where: { source: "inspo" } });
  await prisma.hookRecipe.deleteMany({ where: { source: "inspo" } });

  let seeded = 0;
  for (const item of items) {
    const response = await fetch(`http://localhost:3000/api/inspo/${item.id}/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patterns", targetGenre: "melodic_techno_trance" })
    });
    if (response.ok) seeded += 1;
  }

  console.log(`Seeded ${seeded} inspo items.`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
