import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");
  console.log("⚠️  NOTE: Passwords are temporary dev-only. Change immediately in production!\n");

  // Admin User
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || (Math.random().toString(36).slice(-12));
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminHash,
      role: "ADMIN",
      isApproved: true,
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${admin.username}`);
  console.log(`   Dev password: ${adminPassword}`);

  // Agent User
  const agentPassword = process.env.SEED_AGENT_PASSWORD || (Math.random().toString(36).slice(-12));
  const agentHash = await bcrypt.hash(agentPassword, 10);
  const agent = await prisma.user.upsert({
    where: { username: "agent01" },
    update: {},
    create: {
      username: "agent01",
      passwordHash: agentHash,
      role: "AGENT",
      isApproved: true,
      isActive: true,
    },
  });
  console.log(`✅ Agent created: ${agent.username}`);
  console.log(`   Dev password: ${agentPassword}`);

  // Product
  const product = await prisma.product.upsert({
    where: { id: "product-premium-01" },
    update: {},
    create: {
      id: "product-premium-01",
      name: "Link Redeem Premium",
      price: 350000,
      description: "Akses premium eksklusif berisi link redeem yang siap digunakan. Berlaku selamanya.",
      isActive: true,
    },
  });
  console.log(`✅ Product created: ${product.name}`);

  // Redeem Stocks
  const stockLinks = [
    "https://example.com/redeem/ABCD-1234-EFGH",
    "https://example.com/redeem/IJKL-5678-MNOP",
    "https://example.com/redeem/QRST-9012-UVWX",
    "https://example.com/redeem/YZ12-3456-ABCD",
    "https://example.com/redeem/EFGH-7890-IJKL",
  ];

  for (const link of stockLinks) {
    await prisma.redeemStock.upsert({
      where: { id: `stock-${link.slice(-16)}` },
      update: {},
      create: {
        id: `stock-${link.slice(-16)}`,
        productId: product.id,
        redeemUrl: link,
        status: "AVAILABLE",
      },
    });
  }
  console.log(`✅ ${stockLinks.length} stock links created`);

  // Voucher
  await prisma.voucher.upsert({
    where: { code: "HEMAT100K" },
    update: {},
    create: {
      code: "HEMAT100K",
      discountAmount: 100000,
      quota: 10,
      usedCount: 0,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Voucher created`);

  console.log("\n🎉 Seed completed!");
  console.log("⚠️  For production: use change-password.js to set real passwords.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
