const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const models = Object.keys(p).filter(k => !k.startsWith("_") && !k.startsWith("$") && typeof p[k] === "object");
console.log("Available models:", models.join(", "));
console.log("\nSchedule-related:");
console.log(models.filter(m => m.toLowerCase().includes("schedule")).join(", "));
