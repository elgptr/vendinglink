import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Guard: Skip seed in production
  if (process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production") {
    console.log("⚠️  Seed skipped in production. Use change-password.js for password changes.");
    return;
  }

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

  // Products
  const productsToSeed = [
    {
      id: "prod-claude-api-500",
      name: "Claude Models $500 API Token",
      price: 300000,
      originalPrice: 750000,
      showOriginalPrice: true,
      description: "Langganan $500 token untuk Claude models (Opus, Sonnet). Cocok untuk bangun aplikasi dengan cepat dan selesaikan use case development Anda.",
      isActive: true,
      stockCount: 5,
    },
    {
      id: "prod-google-pro-family",
      name: "Google One Pro Family",
      price: 250000,
      originalPrice: 450000,
      showOriginalPrice: true,
      description: "Google Pro untuk Family plan. Jauh lebih murah dibandingkan dengan berlangganan individu bulanan.",
      isActive: true,
      stockCount: 10,
    },
    {
      id: "prod-anthropic-pro",
      name: "Anthropic Claude Pro",
      price: 150000,
      originalPrice: 300000,
      showOriginalPrice: true,
      description: "Akses eksklusif ke Claude 3 Opus, limits yang lebih besar dan akses fitur baru lebih awal.",
      isActive: true,
      stockCount: 0, // Habis (Out of stock) to demonstrate the disabled state
    },
    {
      id: "prod-chatgpt-plus",
      name: "ChatGPT Plus Premium",
      price: 120000,
      originalPrice: null,
      showOriginalPrice: false,
      description: "Akses ke model GPT-4o, DALL-E 3, dan Advanced Data Analysis tanpa batas waktu.",
      isActive: true,
      stockCount: 2,
    },
  ];

  for (const p of productsToSeed) {
    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        showOriginalPrice: p.showOriginalPrice,
        description: p.description,
        isActive: p.isActive,
      },
    });
    console.log(`✅ Product created: ${product.name}`);

    // Create stocks for this product
    for (let i = 0; i < p.stockCount; i++) {
      const uniqueCode = `${p.id}-${i}-${Math.random().toString(36).slice(-6)}`.slice(-16);
      await prisma.redeemStock.upsert({
        where: { id: `stock-${uniqueCode}` },
        update: {},
        create: {
          id: `stock-${uniqueCode}`,
          productId: product.id,
          redeemUrl: `https://example.com/redeem/${uniqueCode}`,
          status: "AVAILABLE",
        },
      });
    }
  }

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
