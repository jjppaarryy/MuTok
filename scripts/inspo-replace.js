const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/inspo-replace.js /path/to/inspo.json");
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));

  await prisma.variant.deleteMany({ where: { source: "inspo" } });
  await prisma.hookRecipe.deleteMany({ where: { source: "inspo" } });
  await prisma.inspoItem.deleteMany();
  await prisma.inspoImportLog.deleteMany();

  const response = await fetch("http://localhost:3000/api/inspo/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const raw = await response.text();
  if (!response.ok) {
    console.error("Import failed:", response.status, raw);
    return;
  }
  const data = raw ? JSON.parse(raw) : { imported: 0 };
  console.log("Import result:", data);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
