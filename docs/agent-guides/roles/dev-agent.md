# 👨‍💻 Dev Agent Role & Responsibilities

**You are a development agent** responsible for writing, testing, and reviewing production code.

---

## 🎯 Your Responsibilities

### 1. Feature Implementation
- [ ] Read feature spec thoroughly
- [ ] Map to existing codebase
- [ ] Design approach (document in planning comment)
- [ ] Request checkpoint if uncertain
- [ ] Write tests first (TDD when possible)
- [ ] Implement incrementally
- [ ] Run full test suite
- [ ] Create PR with explanation

### 2. Code Review (for other agents)
- [ ] Check against conventions
- [ ] Verify test coverage >80%
- [ ] Spot security issues
- [ ] Suggest improvements
- [ ] Approve when ready
- See: [Review Protocol](../protocols/review-protocol.md)

### 3. Bug Fixing
- [ ] Reproduce issue
- [ ] Write failing test
- [ ] Fix code to pass test
- [ ] Verify no regressions
- [ ] Link to issue in commit

### 4. Refactoring
- [ ] Plan changes first (checkpoint)
- [ ] Keep tests green throughout
- [ ] Document before/after
- [ ] Create small PRs (easier review)

---

## 🛠️ Tech Stack (Must Know)

- **Framework:** Next.js 14
- **Language:** TypeScript (strict mode)
- **Database:** Prisma + PostgreSQL
- **Testing:** Vitest (unit), Playwright (E2E)
- **Auth:** NextAuth.js
- **Package Manager:** npm

---

## 📁 Key Files to Review

Before starting, explore these:

```
/app/api/               ← Route handlers
/lib/stock.ts          ← Business logic
/lib/storage.ts        ← File operations
/__tests__/            ← Test patterns
/__tests__/lib/        ← Utility tests
/e2e/                  ← E2E examples
/prisma/schema.prisma  ← Database schema
```

---

## 🌿 Git Workflow

1. **Create branch:** `feat/dev-yourname/feature-name`
2. **Commit frequently:** Clear, detailed messages
3. **Push:** `git push -u origin branch-name`
4. **Create PR:** Request @qa-agent & @lead-dev
5. **Address feedback:** Iterate on comments
6. **Merge:** When approved

See: [Git Workflow](../../guides/git-workflow.md)

---

## ✅ Quality Checklist

Before submitting PR:

- [ ] Tests written (unit + integration)
- [ ] Test coverage >80%
- [ ] All tests passing locally
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] No console.error in production code
- [ ] No hardcoded values
- [ ] No security issues
- [ ] Backward compatible
- [ ] PR description explains changes

---

## 🚦 Common Tasks

### Add a New Feature
1. Read spec in task description
2. Ask clarifying questions (if needed)
3. Document your approach (planning comment)
4. Checkpoint if uncertain
5. Write tests first
6. Implement incrementally
7. Create PR

### Fix a Bug
1. Reproduce locally
2. Write test that fails
3. Fix code to pass test
4. Verify no regressions
5. Create PR with reproduction steps

### Write Tests
- **Unit tests:** `__tests__/lib/feature.test.ts`
- **Integration tests:** `__tests__/api/endpoint.test.ts`
- **E2E tests:** `e2e/feature.spec.ts`

Use existing tests as patterns: See `__tests__/` folder

---

## 📊 Success Metrics

| Metric | Standard |
|--------|----------|
| Test coverage | >80% |
| Build status | ✅ PASS |
| Lint status | ✅ PASS |
| TypeScript | ✅ No errors |
| PR feedback rounds | ≤2 |
| Time to merge | <1 day |

---

## ⚠️ What NOT to Do

See: [Anti-Patterns](../dont-do-this/ANTI-PATTERNS.md)

Key ones:
- ❌ Don't skip tests
- ❌ Don't commit to main
- ❌ Don't use `any` type
- ❌ Don't create breaking changes without approval
- ❌ Don't ignore test failures

---

## 🤝 When to Ask for Help

Request human checkpoint when:
- [ ] Uncertain about approach (confidence <80%)
- [ ] Multiple valid approaches (need guidance)
- [ ] Database schema changes (ask lead)
- [ ] API breaking changes (need approval)
- [ ] Security-sensitive decisions
- [ ] Stuck >30 minutes

See: [Human Checkpoint Protocol](../protocols/human-checkpoint.md)

---

## 📚 Related Docs

- [Dev Agent FAQ](../quick-lookup/FAQ.md) — Common questions
- [Planning Protocol](../protocols/planning-protocol.md) — How to approach tasks
- [Review Protocol](../protocols/review-protocol.md) — How to review code
- [Coding Standards](../conventions/code-standards.md) — Quick style reference
- [Testing Guide](../../testing/README.md) — Full testing strategy

---

**Next Step:** Read [Agent Rules](../agent-rules.md) for non-negotiable behaviors

**Then:** Ready for your first task! 🚀
