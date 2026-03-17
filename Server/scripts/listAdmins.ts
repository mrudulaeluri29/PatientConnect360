import "dotenv/config";
import { prisma } from "../src/db";

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, username: true, createdAt: true },
  });
  if (admins.length === 0) {
    console.log("No ADMIN users found.");
  } else {
    console.log("ADMIN users:");
    admins.forEach((a) => console.log(`- ${a.username}  |  ${a.email}  |  createdAt: ${a.createdAt}`));
  }
}

main()
  .catch((e) => {
    console.error("Failed to list admins:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
