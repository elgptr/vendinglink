# 🎯 Agent Rules: Rule Zero & Core Behaviors

**Read this first.** These are non-negotiable.

---

## Rule Zero: Four Principles

All agent behavior flows from these:

### 1. **Transparency First**
- ✅ Always explain your reasoning
- ✅ Show your work (commit messages, comments, planning)
- ✅ Flag assumptions upfront
- ✅ Ask clarifying questions before assuming
- ❌ Never: Proceed silently with uncertain assumptions

### 2. **Quality Before Speed**
- ✅ Tests > Shortcuts
- ✅ Clean code > Clever code
- ✅ Complete > Fast
- ✅ Maintainable > Optimized (unless specified)
- ❌ Never: Skip tests to save time

### 3. **Humans Decide, Agents Execute**
- ✅ Complex decisions → Request checkpoint
- ✅ Design choices → Ask for guidance
- ✅ Breaking changes → Get approval first
- ✅ Uncertain approach → Stop and ask
- ❌ Never: Make architectural decisions alone

### 4. **Project Over Performance**
- ✅ Follow team conventions
- ✅ Use existing patterns (even if not perfect)
- ✅ Maintainability > Personal preference
- ✅ Consistency > Optimization
- ❌ Never: Introduce new approaches without approval

---

## Required Behaviors

### ✅ Always Do

**Before Writing Code**
- [ ] Read the feature spec thoroughly
- [ ] Ask clarifying questions if ambiguous
- [ ] Map to existing code patterns
- [ ] Identify unknowns
- [ ] Document your approach (planning doc or PR comment)

**While Writing Code**
- [ ] Follow project conventions (naming, style, structure)
- [ ] Run tests frequently (don't wait to the end)
- [ ] Commit frequently with clear messages
- [ ] No hardcoded values (use constants/env vars)
- [ ] No secrets in code
- [ ] No console.log in production

**Before Submitting**
- [ ] Run full test suite (npm run test:run)
- [ ] Build succeeds (npm run build)
- [ ] No TypeScript errors (strict mode)
- [ ] Tests pass locally
- [ ] All new code tested
- [ ] No regressions to existing tests

**During Review**
- [ ] Address all feedback
- [ ] Ask for clarification if confused
- [ ] Update code or explain decision
- [ ] Iterate until approved

### ❌ Never Do

| Behavior | Why | What to Do Instead |
|----------|-----|-------------------|
| ❌ Assume context | Leads to wrong solutions | Ask clarifying questions |
| ❌ Push to main directly | Breaks production | Use feature branch + PR |
| ❌ Skip tests | Bugs reach production | Always write tests first |
| ❌ Modify production configs | Could break live service | Request checkpoint first |
| ❌ Create breaking changes silently | Breaks for other users | Plan deprecation + approval |
| ❌ Delete code without understanding | Can't undo mistakes | Check impact + ask if unsure |
| ❌ Commit secrets/credentials | Security breach | Use .env & secrets manager |
| ❌ Ignore test failures | Hides problems | Fix or ask for checkpoint |
| ❌ Use `any` type in TypeScript | Defeats type safety | Use proper types or ask lead |
| ❌ Mix generated files with source | Repository bloat | Exclude via .gitignore |

---

## Communication Standards

### Commit Messages
```
✅ GOOD:
  "feat: add batch stock claim with FIFO ordering (fixes race condition)"
  "fix: sanitize filename to prevent path traversal"
  "test: add edge case for concurrent stock claims"

❌ BAD:
  "update"
  "fix bug"
  "work in progress"
```

### PR Titles
```
✅ GOOD:
  "feat: Multi-quantity checkout for agents"
  "fix: Race condition in stock claiming"

❌ BAD:
  "Update"
  "Fix stuff"
```

### Comments in Code Review
```
✅ GOOD:
  "This follows pattern X from lib/util.ts — nice!"
  "Concern: This breaks backward compat. See CONTRIBUTING.md"

❌ BAD:
  "Bad code"
  "Wrong"
```

---

## Checkpoint Decision Matrix

### ✅ Request Checkpoint When:

| Situation | Uncertainty | Action |
|-----------|------------|--------|
| Multiple valid approaches | Unsure which is best | Present options, ask guidance |
| Database schema changes | Impact unknown | Stop, checkpoint before migrating |
| API breaking changes | Backward compat risk | Get approval first |
| Large refactoring | >200 LOC changes | Plan first, get checkpoint |
| Security-sensitive code | Uncertain about vulnerabilities | Request review before coding |
| Architectural decision | New pattern needed | Design & checkpoint first |

---

## Git Workflow (Required)

### Branch Naming
```
feat/agentname/feature-description
fix/agentname/bug-description
test/agentname/test-description
```

### Commit Workflow
1. Create feature branch
2. Make changes, commit frequently
3. Push: `git push -u origin branch-name`
4. Create PR (request review)
5. **Never merge your own PR**

---

## Quality Standards

### Test Coverage
- ✅ Unit tests: >80% coverage minimum
- ✅ Integration tests: All endpoints covered
- ✅ E2E tests: Critical workflows covered
- ✅ Edge cases: Error paths tested

### Code Quality
- ✅ TypeScript: No `any`, strict mode
- ✅ Linting: No warnings
- ✅ No console.log in production
- ✅ Security: No hardcoded credentials

---

## Success Criteria

You're doing well if:
- ✅ Tests pass locally before submitting
- ✅ Commits have clear messages
- ✅ PRs describe changes + reasoning
- ✅ Code follows team patterns
- ✅ No ignored test failures

---

**Next:** Read your role guide ([Dev Agent](./roles/dev-agent.md) or [QA Agent](./roles/qa-agent.md))

**Questions?** Check [FAQ](./quick-lookup/FAQ.md)
