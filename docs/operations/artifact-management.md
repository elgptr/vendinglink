# E2E Test Reports & CI/CD Artifact Management

**Last Updated:** 2026-09-14  
**Status:** ✅ Best Practice Implementation

---

## Overview

E2E test reports (Playwright) are **generated artifacts**, not source code. They should:
- ✅ Be excluded from Git repository (via `.gitignore`)
- ✅ Be stored in CI/CD platform artifact storage
- ✅ Be available for 30 days for debugging
- ✅ Prevent repository bloat

---

## What Gets Excluded from Git

| File Type | Excluded | Why |
|-----------|----------|-----|
| `playwright-report/` | ✅ YES | Generated HTML report (~5-50 MB) |
| `test-results/` | ✅ YES | Generated JSON results |
| Screenshots from failures | ✅ YES | Binary files, large |
| Video recordings | ✅ YES | Very large files (100-500 MB) |
| `.playwright/` cache | ✅ YES | Local cache, not needed |

---

## What Stays in Git

| File Type | Included | Why |
|-----------|----------|-----|
| `e2e/*.spec.ts` | ✅ YES | Test code/source |
| `playwright.config.ts` | ✅ YES | Configuration |
| Test fixtures | ✅ YES | Reusable code |
| `package.json` | ✅ YES | Dependencies & scripts |

---

## Local Development Workflow

### Running Tests Locally
```bash
# Run E2E tests
npm run test:e2e

# Output generated in local folders (NOT in git):
# - playwright-report/          (HTML report)
# - test-results/               (JSON results)
# - screenshots/                (failure screenshots)
# - videos/                     (test recordings)

# View report locally
npx playwright show-report
```

### Checking Git Status
```bash
git status
# Should NOT show playwright-report/ or test-results/
# If they appear, they're already excluded by .gitignore
```

---

## CI/CD Pipeline Workflow

### GitHub Actions Example

```yaml
name: E2E Tests CI

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:e2e
      
      # Store report as CI artifact (NOT in git)
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_number }}
          path: playwright-report/
          retention-days: 30
      
      # Store test results
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ github.run_number }}
          path: test-results/
          retention-days: 30
      
      # Store failure screenshots
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-failures-${{ github.run_number }}
          path: |
            screenshots/
            videos/
          retention-days: 30
```

### What Happens
1. ✅ Tests run in CI environment
2. ✅ Reports generated
3. ✅ Reports uploaded to GitHub Actions (artifact storage)
4. ✅ Reports NOT committed to git
5. ✅ Available for download from GitHub UI for 30 days
6. ✅ Git history stays clean

---

## Downloading Test Reports

### From GitHub Actions
1. Go to **Actions** tab in GitHub
2. Click on workflow run
3. Scroll to **Artifacts** section
4. Download `playwright-report-XXX`
5. Extract and open `index.html` in browser

### From CI Platform
- **GitHub Actions:** Artifacts tab in workflow run
- **GitLab CI:** Artifacts section in pipeline
- **Jenkins:** Archived artifacts
- **CircleCI:** Artifacts tab

---

## Best Practices

### ✅ DO
- ✅ Keep test spec files (`*.spec.ts`) in git
- ✅ Keep configuration files in git
- ✅ Store reports in CI artifact storage
- ✅ Clean up old artifacts (30-day retention)
- ✅ Document test failures in PR comments

### ❌ DON'T
- ❌ Commit test reports to git
- ❌ Commit large binary files (videos, screenshots)
- ❌ Keep test artifacts forever
- ❌ Mix generated files with source code

---

## Verifying Setup

### Check .gitignore
```bash
# Verify E2E paths are excluded
cat .gitignore | grep -A 5 "E2E Test Reports"

# Expected output:
# playwright-report/
# test-results/
# /screenshots/
# /videos/
```

### Check Git Tracking
```bash
# Verify test reports NOT tracked
git status

# Should show:
# Nothing about playwright-report/
# Nothing about test-results/
# (files excluded by .gitignore)
```

### Force Untrack if Needed
```bash
# Remove from git tracking (keep files locally)
git rm --cached -r playwright-report/ test-results/
git commit -m "chore: remove test artifacts from git tracking"
git push
```

---

## Repository Size Impact

### Before (With Reports in Git)
```
Repository size:  500+ MB
Clone time:       30-60 seconds
Fetch time:       20-30 seconds
History size:     Large
```

### After (Reports Excluded)
```
Repository size:  50 MB
Clone time:       5-10 seconds
Fetch time:       2-5 seconds
History size:     Clean
```

---

## Troubleshooting

### Q: I accidentally committed test reports
**A:** Remove them from git (see "Force Untrack" section above)

### Q: CI reports not visible
**A:** Check GitHub Actions → Artifacts tab for your run number

### Q: Reports take too long to download
**A:** Reduce retention-days in CI config (default 30 is reasonable)

### Q: How long are reports kept?
**A:** 30 days in GitHub Actions (configurable)

---

## Related Files

- `.gitignore` - Exclusion rules
- `playwright.config.ts` - Playwright configuration
- `.github/workflows/*.yml` - CI/CD workflows
- `package.json` - Test scripts

---

## For Implementation Team

When setting up CI/CD for this project:

1. ✅ Use the GitHub Actions example above
2. ✅ Configure artifact retention (30 days recommended)
3. ✅ Set up failure notifications
4. ✅ Add artifact download link to PR comments
5. ✅ Monitor artifact storage quota

---

**Status:** ✅ Implementation Complete - E2E reports properly excluded from git
