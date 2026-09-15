# 📋 Planning Protocol: How to Approach Tasks

When given a task, follow this protocol to ensure **transparency** and **quality**.

---

## 🎯 Five Stages

1. **UNDERSTAND** — What are you building?
2. **PLAN** — How will you build it?
3. **CHECKPOINT** — Get human approval (if uncertain)
4. **EXECUTE** — Build it
5. **DELIVER** — Submit for review

---

## ⚙️ STAGE 1: UNDERSTAND (2-3 min)

**Goal:** Crystal clear understanding of requirements

### Actions

1. **Read the task** thoroughly
   - What's being requested?
   - Why is it needed?
   - Who will use it?

2. **Ask clarifying questions** (if ambiguous)
   - Should this apply to existing customers?
   - What's the max value?
   - Is this high priority?

3. **Map to existing code**
   - Where will changes go?
   - Are there similar patterns?
   - What utilities can I reuse?

4. **Identify unknowns**
   - What don't I know?
   - What needs research?
   - What might cause problems?

### Output

**Clear understanding.** You can explain in 1-2 sentences.

---

## 📐 STAGE 2: PLAN (3-5 min)

**Goal:** Design approach before you code

### Write Your Plan

Use this format:

```markdown
## Implementation Plan

### What I'm Building
[Brief description]

### Approach
1. Step A (file: X)
2. Step B (file: X)
3. Step C (file: X)

### Tests I'll Write
- Unit test for utility
- Integration test for API
- E2E test for workflow

### Uncertain Areas
- [ ] Decision X: need checkpoint? YES/NO
- [ ] Decision Y: need checkpoint? YES/NO

### Success Criteria
- Tests pass
- No regressions
- Backward compatible

### Estimated Time
[Your estimate]
```

### Example

```markdown
## Implementation Plan: Multi-Qty Checkout

### What I'm Building
Allow agents to order 1-10 of same product in single checkout

### Approach
1. Update Zod schema in /lib/stock.ts (add qty field, validate 1-10)
2. Modify claimAvailableStock() to batch-claim (qty items)
3. Update POST /app/api/checkout/agent/route.ts
4. Add UI qty selector
5. Write tests for batch claim

### Tests
- Unit: claimAvailableStockBatch(qty=5) returns 5 stocks
- Integration: POST with qty=5 claims 5
- E2E: Agent selects qty, checks out, receives items

### Uncertain
- [ ] FIFO ordering with concurrent claims: YES
- [ ] Backward compat (qty undefined → 1): YES

### Success Criteria
- All tests pass
- No regressions
- Customer checkout unaffected
- Backward compatible
```

---

## 🛑 STAGE 3: CHECKPOINT (If Needed)

**Goal:** Get human approval before coding

### Request When

- ❌ Uncertain area (marked YES in plan)
- ❌ Multiple valid approaches
- ❌ Database schema changes
- ❌ API breaking changes
- ❌ Confidence <80%

### How to Request

1. Post your plan (use format above)
2. Highlight what you're NOT sure about
3. Ask specific question
4. Tag: @lead-dev

### Wait Time

- Expected: <2 hours
- Urgent: Say "blocking"
- No response in 1 hour: Ask in #dev

### Response

You'll get one of:
- ✅ "Approved, proceed"
- 🔄 "Try approach B instead"
- ❌ "Don't do that, replan"
- ❓ "Tell me more about..."

---

## 🚀 STAGE 4: EXECUTE (Varies)

**Goal:** Implement the approved plan

### Actions

1. **Create branch:**
   ```bash
   git checkout -b feat/dev-yourname/feature-name
   ```

2. **Work incrementally**
   - Write tests first (TDD)
   - Implement to pass test
   - Commit frequently
   - Test after each piece

3. **Run tests constantly**
   - After each commit: `npm run test:run`
   - Before submitting: Full suite

4. **Clear commit messages**
   ```
   feat: add batch stock claim (FIFO ordered)
   fix: prevent race condition
   test: verify concurrent atomicity
   ```

### Troubleshooting

**Tests fail:**
- Diagnose, fix
- Stuck >30 min → checkpoint

**Approach doesn't work:**
- Request checkpoint
- Get new direction

**Blocker appears:**
- Request checkpoint
- Don't proceed without approval

---

## ✅ STAGE 5: DELIVER (5-10 min)

**Goal:** Submit work for review

### Before Submitting

```bash
npm run test:run      # Tests pass
npm run build         # TypeScript clean
npm run lint          # Code style OK
```

### Create PR

**Title:** Clear, <70 chars
```
feat: Add multi-qty checkout for agents
fix: Prevent race condition in stock claim
test: Add E2E scenario for admin upload
```

**Description:**
```markdown
## What
[What are you building? Why?]

## Changes
- File X: [what changed]
- File Y: [what changed]

## Tests
- Unit: [description]
- Integration: [description]
- E2E: [description]

## Verify
```bash
npm run test:run
npm run test:e2e
```

## Checklist
- [x] Tests pass locally
- [x] Build succeeds
- [x] No regressions
- [x] Backward compatible
```

### Request Reviewers
- @qa-agent (for tests)
- @dev-lead (for approach)

---

## 📊 Protocol Checklist

| Stage | Time | Deliverable |
|-------|------|-------------|
| UNDERSTAND | 2-3 min | Clear requirements |
| PLAN | 3-5 min | Written approach |
| CHECKPOINT | <2 hrs | Human approval |
| EXECUTE | Varies | Working code + tests |
| DELIVER | 5-10 min | PR ready for review |

---

**Ready to plan your task?** Start with UNDERSTAND stage!

**Questions?** Check [FAQ](../quick-lookup/FAQ.md)
