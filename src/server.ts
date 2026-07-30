import "dotenv/config";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const PORT = Number(process.env.PORT) || 3000;

try {
  await prisma.$connect();
  console.log("Database connected");
} catch (err) {
  console.error("Failed to connect to database:", err);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
