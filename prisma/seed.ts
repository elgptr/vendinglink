import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ─── 1. Admin User ────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("adminpassword", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${admin.username}`);

  // ─── 2. Agent User ────────────────────────────────────────────────────────
  const agentHash = await bcrypt.hash("agentpassword", 10);
  const agent = await prisma.user.upsert({
    where: { username: "agent01" },
    update: {},
    create: {
      username: "agent01",
      passwordHash: agentHash,
      role: "AGENT",
      isActive: true,
    },
  });
  console.log(`✅ Agent created: ${agent.username}`);

  // ─── 3. Product ───────────────────────────────────────────────────────────
  const product = await prisma.product.upsert({
    where: { id: "product-premium-01" },
    update: {},
    create: {
      id: "product-premium-01",
      name: "Link Redeem Premium",
      price: 350000,
      description:
        "Akses premium eksklusif berisi link redeem yang siap digunakan. Berlaku selamanya.",
      isActive: true,
    },
  });
  console.log(`✅ Product created: ${product.name}`);

  // ─── 4. Redeem Stocks ─────────────────────────────────────────────────────
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

  // ─── 5. Voucher ───────────────────────────────────────────────────────────
  await prisma.voucher.upsert({
    where: { code: "HEMAT100K" },
    update: {},
    create: {
      code: "HEMAT100K",
      discountAmount: 100000,
      quota: 10,
      usedCount: 0,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari
    },
  });
  console.log(`✅ Voucher created: HEMAT100K (Rp100.000 off, quota 10)`);

  console.log("\n🎉 Seed completed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Admin    → username: admin      | password: adminpassword");
  console.log("Agent    → username: agent01    | password: agentpassword");
  console.log("Voucher  → HEMAT100K (Rp100.000 off)");
  console.log("Stok     → 5 link redeem tersedia");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
