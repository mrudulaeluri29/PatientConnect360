import "dotenv/config";
import { prisma } from "../src/db";

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true, username: true, role: true, createdAt: true, lastLogin: true, failedLoginAttempts: true },
    orderBy: { createdAt: "asc" }
  });

  if (!admin) {
    console.log("No ADMIN user found.");
    return;
  }

  console.log("ADMIN record:");
  console.log(`- id: ${admin.id}`);
  console.log(`- username: ${admin.username}`);
  console.log(`- email: ${admin.email}`);
  console.log(`- role: ${admin.role}`);
  console.log(`- createdAt: ${admin.createdAt}`);
  console.log(`- lastLogin: ${admin.lastLogin ?? "<never>"}`);
  console.log(`- failedLoginAttempts: ${admin.failedLoginAttempts}`);
}

main()
  .catch((e) => {
    console.error("Failed to fetch admin:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
