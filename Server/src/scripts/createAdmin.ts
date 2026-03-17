import "dotenv/config";
import { prisma } from "../db";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const overwrite = (process.env.ADMIN_OVERWRITE || "false").toLowerCase() === "true";
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim();
  const phoneNumber = process.env.ADMIN_PHONE?.trim();
  const superAdmin = (process.env.ADMIN_SUPER || "false").toLowerCase() === "true";

  if (!email || !username || !password) {
    console.error("Missing ADMIN_* env vars. Required: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD");
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters long.");
    process.exitCode = 1;
    return;
  }

  // Ensure username uniqueness (fail fast if username used by someone else)
  const existingByUsername = await prisma.user.findUnique({ where: { username } });
  if (existingByUsername && existingByUsername.email !== email) {
    console.error(`Username '${username}' is already taken by another user (id: ${existingByUsername.id}). Choose a different ADMIN_USERNAME.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Check if a user exists with this email
  const existingByEmail = await prisma.user.findUnique({ where: { email } });

  if (!existingByEmail) {
    // Create new admin
    const admin = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    // Create AdminProfile row
  await (prisma as any).adminProfile.create({
      data: {
        userId: admin.id,
        displayName: displayName || username,
        phoneNumber: phoneNumber,
        superAdmin,
      },
    });
    console.log(`✅ Created admin user & profile: ${admin.username} (${admin.email})`);
  } else {
    // User exists by email
    if (existingByEmail.role !== "ADMIN") {
      if (!overwrite) {
        console.warn(
          `A user with email ${email} exists with role ${existingByEmail.role}. Set ADMIN_OVERWRITE=true to elevate to ADMIN and/or reset password.`
        );
      } else {
        const updated = await prisma.user.update({
          where: { email },
          data: {
            role: Role.ADMIN,
            username, // keep desired admin username (unique constraint was checked earlier)
            passwordHash,
          },
        });
        // Upsert profile
  await (prisma as any).adminProfile.upsert({
          where: { userId: updated.id },
          update: {
            displayName: displayName || updated.username,
            phoneNumber,
            superAdmin,
          },
          create: {
            userId: updated.id,
            displayName: displayName || updated.username,
            phoneNumber,
            superAdmin,
          },
        });
        console.log(`🔁 Updated user to ADMIN & ensured profile: ${updated.username} (${updated.email})`);
      }
    } else {
      // Already an admin
      if (!overwrite) {
        console.log(`ℹ️ Admin already exists: ${existingByEmail.username} (${existingByEmail.email}). Nothing to do.`);
      } else {
        const updated = await prisma.user.update({
          where: { email },
          data: {
            username,
            passwordHash,
          },
        });
  await (prisma as any).adminProfile.upsert({
          where: { userId: updated.id },
          update: {
            displayName: displayName || updated.username,
            phoneNumber,
            superAdmin,
          },
          create: {
            userId: updated.id,
            displayName: displayName || updated.username,
            phoneNumber,
            superAdmin,
          },
        });
        console.log(`🔐 Reset admin password/username & synced profile: ${updated.username} (${updated.email})`);
      }
    }
  }
}

main()
  .catch((err) => {
    console.error("Admin seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
