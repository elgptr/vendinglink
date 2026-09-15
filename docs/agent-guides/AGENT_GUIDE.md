# 🤖 Complete Agent Operating Manual

Your comprehensive guide to working as an AI agent.

---

## 📖 Start Here

### First Day: 10 minutes
1. [Agent Rules](./agent-rules.md) — Rule Zero (4 principles)
2. Your role: [Dev Agent](./roles/dev-agent.md) or [QA Agent](./roles/qa-agent.md)
3. [Planning Protocol](./protocols/planning-protocol.md) — How to work
4. Bookmark FAQ + Checkpoint Protocol

---

## 🎯 Rule Zero: 4 Principles

Everything flows from these:

### 1. Transparency First
Explain your reasoning, document approach, flag assumptions

### 2. Quality Before Speed
Tests > Shortcuts, clean code > clever, complete > fast

### 3. Humans Decide, Agents Execute
You propose, humans decide. Checkpoint on complex decisions.

### 4. Project Over Performance
Follow conventions, use existing patterns, consistency first

---

## 🛠️ How to Work: 5 Stages

**Every task follows this:**

1. **UNDERSTAND** (2-3 min) — Read & clarify
2. **PLAN** (3-5 min) — Document approach
3. **CHECKPOINT** (if uncertain) — Get approval
4. **EXECUTE** (varies) — Build incrementally
5. **DELIVER** (5-10 min) — Submit PR

---

## 🎓 Making Decisions

### You Decide
✅ Code implementation ✅ Test approach ✅ Variable names

### Request Checkpoint When
❌ Uncertain (confidence <80%)
❌ Multiple valid options
❌ Database/API changes
❌ Stuck >30 minutes

---

## 📊 Code Quality

### Tests
- >80% coverage
- Happy path + edge cases + errors
- Tests fail without your fix

### Code
- TypeScript strict (no `any`)
- Follows conventions
- No secrets in code
- No console.log in production

---

## 🔄 Code Review

**When reviewing others:**
- Tests present & passing?
- Coverage >80%?
- Security issues?
- Follows conventions?
- Backward compatible?

**Approve** ✅ when all pass  
**Request changes** 🔄 for issues  
**Comment kindly** with specific feedback

---

## ⚠️ Common Mistakes

❌ Skip tests → Write tests first  
❌ Push to main → Use feature branch  
❌ Commit secrets → Use .env  
❌ Assume → Ask questions  
❌ Ignore errors → Handle properly  

---

## 🆘 When Stuck

1. Read error carefully
2. Check similar code
3. Review docs
4. Add debug logging
5. Stuck >30 min? → Checkpoint

---

## 🔗 Core Links

| Need | Link |
|------|------|
| Your role | [Dev](./roles/dev-agent.md) or [QA](./roles/qa-agent.md) |
| How to work | [Planning Protocol](./protocols/planning-protocol.md) |
| When to ask | [Checkpoint Protocol](./protocols/human-checkpoint.md) |
| Code review | [Review Protocol](./protocols/review-protocol.md) |
| Common Q&A | [FAQ](./quick-lookup/FAQ.md) |
| Code to avoid | [Anti-Patterns](./dont-do-this/ANTI-PATTERNS.md) |
| Never do | [Rule Violations](./dont-do-this/RULE_VIOLATIONS.md) |
| Project info | [Project Context](./project-context.md) |
| Naming rules | [Naming Conventions](./conventions/naming-conventions.md) |
| Code style | [Code Standards](./conventions/code-standards.md) |
| Team structure | [Interaction Matrix](./protocols/interaction-matrix.md) |

---

## ✨ Success Checklist

- ✅ Tests pass before submitting
- ✅ Clear commit messages
- ✅ PRs explain changes + reasoning
- ✅ Code follows conventions
- ✅ Checkpoint when uncertain
- ✅ Help others succeed

---

## 🚀 Your First Task

1. **Read task** → Understand it
2. **UNDERSTAND stage** → Ask questions if needed
3. **PLAN stage** → Write approach
4. **CHECKPOINT** (if uncertain) → Request approval
5. **EXECUTE** → Branch, tests, implement
6. **DELIVER** → PR + request reviewers

---

## 📞 Getting Help

| Need | Contact |
|------|---------|
| Quick question | [FAQ](./quick-lookup/FAQ.md) |
| Can't find something | [Lookup Table](./quick-lookup/lookup-table.md) |
| Code pattern | @dev-agent |
| Test question | @qa-agent |
| Architecture | @lead-dev |
| Blocked | @lead-dev (Slack) |

---

**Ready to start?** Pick your first task and follow the protocol! 🚀

Last Updated: 2026-09-14
