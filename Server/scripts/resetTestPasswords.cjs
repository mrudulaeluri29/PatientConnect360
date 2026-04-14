const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

async function main() {
  const prisma = new PrismaClient();
  const password = process.env.RESET_PASSWORD || "Kaustav123*";
  const emailsRaw =
    process.env.RESET_EMAILS ||
    "ripkaush@gmail.com,autlexia@gmail.com,kkalra1@asu.edu,testingmpoa@gmail.com";

  const emails = emailsRaw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const hash = await bcrypt.hash(password, 12);

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // eslint-disable-next-line no-console
      console.log(`MISSING ${email}`);
      continue;
    }

    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
    });
    // eslint-disable-next-line no-console
    console.log(`UPDATED ${email}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

