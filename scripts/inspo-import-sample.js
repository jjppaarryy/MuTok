const fs = require("fs");
const path = require("path");

async function run() {
  const payloadPath = path.join(__dirname, "inspo-sample.json");
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
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
  if (!raw) {
    console.log("Import completed with empty response.");
    return;
  }
  const data = JSON.parse(raw);
  console.log("Import result:", data);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
