#!/usr/bin/env node

/**
 * Endpoint Cleanup Verification Script
 * Purpose: Verify no references to deleted /api/order/snap-token endpoint exist in codebase
 * Usage: node scripts/verify-endpoint-cleanup.js
 */

const fs = require('fs');
const path = require('path');

const ENDPOINT_TO_CHECK = '/api/order/snap-token';
const ROOT_DIR = path.join(__dirname, '..');

// File patterns to search (include .ts, .tsx, .js, .jsx, .json)
const FILE_PATTERNS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
  '**/*.json'
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  '.github/workflows',
  'coverage'
];

/**
 * Recursively find all files matching patterns
 */
function findFiles(dir, patterns, excludeDirs) {
  let files = [];

  function walk(currentPath) {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });

    items.forEach((item) => {
      const fullPath = path.join(currentPath, item.name);
      const relativePath = path.relative(ROOT_DIR, fullPath);

      // Skip excluded directories
      if (excludeDirs.some((exclude) => relativePath.includes(exclude))) {
        return;
      }

      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile()) {
        // Check if file matches any pattern
        const fileName = item.name;
        const matches = patterns.some((pattern) => {
          const patternRegex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          return new RegExp(`${patternRegex}$`).test(fileName);
        });

        if (matches) {
          files.push(fullPath);
        }
      }
    });
  }

  walk(dir);
  return files;
}

/**
 * Search file for endpoint references
 */
function searchFileForEndpoint(filePath, endpoint) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const findings = [];

    lines.forEach((line, lineNum) => {
      if (line.includes(endpoint)) {
        findings.push({
          line: lineNum + 1,
          content: line.trim()
        });
      }
    });

    return findings;
  } catch (error) {
    // Skip files that can't be read
    return [];
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n🔍 Endpoint Cleanup Verification Report');
  console.log('========================================\n');
  console.log(`Searching for references to: ${ENDPOINT_TO_CHECK}\n`);

  const files = findFiles(ROOT_DIR, FILE_PATTERNS, EXCLUDE_DIRS);
  console.log(`Files checked: ${files.length}\n`);

  const allFindings = [];

  files.forEach((file) => {
    const findings = searchFileForEndpoint(file, ENDPOINT_TO_CHECK);
    if (findings.length > 0) {
      const relativePath = path.relative(ROOT_DIR, file);
      allFindings.push({
        file: relativePath,
        findings
      });
    }
  });

  if (allFindings.length === 0) {
    console.log(`✅ SUCCESS: No references to "${ENDPOINT_TO_CHECK}" found.`);
    console.log(
      '\n✔️  Endpoint is safe to delete. No code changes required.\n'
    );
    process.exit(0);
  } else {
    console.log(`❌ FOUND ${allFindings.length} file(s) with references:\n`);

    allFindings.forEach((finding, idx) => {
      console.log(`  ${idx + 1}. ${finding.file}`);
      finding.findings.forEach((f) => {
        console.log(`     Line ${f.line}: ${f.content}`);
      });
      console.log();
    });

    console.log(
      `⚠️  WARNING: Cannot delete endpoint until all references are removed.`
    );
    console.log('Action required:\n');
    allFindings.forEach((finding) => {
      console.log(`  - Review and update: ${finding.file}`);
    });
    console.log();

    process.exit(1);
  }
}

main();
