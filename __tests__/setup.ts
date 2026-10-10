/**
 * Vitest setup file.
 *
 * Runs in every worker before test files are loaded. Hard-codes the test
 * database so that a system-level DATABASE_URL cannot accidentally point tests
 * at production. This is a safety net in addition to the override in
 * vitest.config.ts.
 */

process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/vendinglink_dev?schema=public";
process.env.DIRECT_URL = "postgresql://postgres:postgres@localhost:5432/vendinglink_dev?schema=public";
