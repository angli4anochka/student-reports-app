const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const models = Object.keys(p).filter(k => !k.startsWith("_") && !k.startsWith("$"));
console.log("All properties with override:");
console.log(models.filter(m => m.toLowerCase().includes("override")));
console.log("\nTotal models count:", models.filter(k => typeof p[k] === "object").length);
