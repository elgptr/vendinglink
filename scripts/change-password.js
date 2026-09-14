#!/usr/bin/env node

/**
 * Change Admin Password Script
 * Usage: node scripts/change-password.js <username> <newPassword> [database_url]
 *
 * Examples:
 *   node scripts/change-password.js admin MyNewPassword123!
 *   node scripts/change-password.js admin MyNewPassword123! "postgresql://user:pass@host:5432/db"
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function changePassword(username, newPassword, databaseUrl) {
  try {
    // Override DATABASE_URL if provided
    if (databaseUrl) {
      process.env.DATABASE_URL = databaseUrl;
    }

    // Validate inputs
    if (!username || !newPassword) {
      console.error("❌ Error: Username and password are required");
      console.log("Usage: node scripts/change-password.js <username> <newPassword> [database_url]");
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.error("❌ Error: Password must be at least 6 characters");
      process.exit(1);
    }

    console.log(`🔄 Changing password for user: ${username}`);

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.error(`❌ Error: User '${username}' not found`);
      process.exit(1);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { username },
      data: { passwordHash },
    });

    console.log(`✅ Password changed successfully for ${updatedUser.username}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Updated at: ${updatedUser.updatedAt}`);
    console.log(`\n✨ User can now login with the new password`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get arguments
const args = process.argv.slice(2);
const [username, password, dbUrl] = args;

changePassword(username, password, dbUrl);
