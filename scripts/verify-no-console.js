#!/usr/bin/env node

/**
 * Verify No Raw console.* Calls in Production Routes
 * 
 * This script checks that all console.log, console.error, console.warn calls
 * in production route handlers have been replaced with structured logger calls.
 * 
 * Usage:
 *   node scripts/verify-no-console.js
 * 
 * Returns:
 *   0 if no raw console calls found
 *   1 if raw console calls are detected
 */

const fs = require("fs");
const path = require("path");

// Routes to check (must use structured logger)
const ROUTES_TO_CHECK = [
  "app/api/checkout/customer/route.ts",
  "app/api/checkout/agent/route.ts",
  "app/api/midtrans/webhook/route.ts",
  "app/api/order/status/route.ts",
  "app/api/customer/order/status/route.ts",
  "app/api/admin/products/generate-description/route.ts",
  "lib/transactionStatus.ts",
];

// Allowed console calls (none in production routes)
const FORBIDDEN_PATTERNS = [
  /console\.(log|error|warn|info|debug)\s*\(/g,
];

let hasErrors = false;
const results = [];

ROUTES_TO_CHECK.forEach((routePath) => {
  const fullPath = path.join(process.cwd(), routePath);

  if (!fs.existsSync(fullPath)) {
    results.push(`⚠️  SKIP: ${routePath} (file not found)`);
    return;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");

  let foundIssues = false;
  const issues = [];

  lines.forEach((line, idx) => {
    FORBIDDEN_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        // Allow if line contains "logger" (using structured logger)
        if (!line.includes("logger")) {
          foundIssues = true;
          hasErrors = true;
          issues.push({
            line: idx + 1,
            code: line.trim(),
          });
        }
      }
    });
  });

  if (foundIssues) {
    results.push(`❌ FAIL: ${routePath}`);
    issues.forEach((issue) => {
      results.push(
        `  Line ${issue.line}: ${issue.code.substring(0, 80)}`
      );
    });
  } else {
    results.push(`✅ PASS: ${routePath}`);
  }
});

// Print results
console.log("\n🔍 Console Call Verification Report");
console.log("====================================\n");

results.forEach((result) => {
  console.log(result);
});

console.log("\n");

if (hasErrors) {
  console.error(
    "❌ FAILED: Raw console calls detected in production routes.\n" +
    "   Please replace with structured logger (createLogger).\n"
  );
  process.exit(1);
} else {
  console.log(
    "✅ SUCCESS: All production routes use structured logger.\n"
  );
  process.exit(0);
}
