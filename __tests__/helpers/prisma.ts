import { PrismaClient } from "@prisma/client";

/**
 * Create an isolated Prisma client for tests
 *
 * For unit/integration tests, we use the same DATABASE_URL but ensure
 * each test can be isolated via transactions. For full isolation,
 * consider using a test database (e.g., test-specific .env.test).
 */
export function createTestPrisma(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/vendinglink_test",
      },
    },
  });
}

/**
 * Clean up test Prisma instance
 */
export async function cleanupTestPrisma(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
}
