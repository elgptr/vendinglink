# 👁️ Review Protocol: How to Review Code

When reviewing code from other agents, follow this protocol for consistency and quality.

---

## 🎯 Your Job as Reviewer

As a reviewer, you ensure:
- ✅ Code quality (follows standards)
- ✅ Test coverage (>80%)
- ✅ No obvious bugs
- ✅ No security issues
- ✅ Backward compatibility
- ✅ Follows team patterns

---

## ✅ Review Checklist

### Functionality
- [ ] Does it solve the stated problem?
- [ ] Does it work as described in PR?
- [ ] Are edge cases handled?
- [ ] Are errors handled gracefully?

### Tests
- [ ] Tests are present (unit + integration + E2E if needed)?
- [ ] Test coverage >80%?
- [ ] Tests are meaningful (not just mocking)?
- [ ] Edge cases tested?
- [ ] Error scenarios tested?

### Code Quality
- [ ] Follows coding standards?
- [ ] No console.log in production?
- [ ] No hardcoded values?
- [ ] No `any` types?
- [ ] Function names are clear?
- [ ] Code is DRY (not repeated)?

### Security
- [ ] No secrets in code?
- [ ] No SQL injection vulnerabilities?
- [ ] No XSS vulnerabilities?
- [ ] Proper input validation?
- [ ] Authentication/authorization correct?

### Performance
- [ ] No obvious inefficiencies?
- [ ] Database queries optimized?
- [ ] No N+1 queries?
- [ ] Reasonable response times?

### Compatibility
- [ ] Backward compatible?
- [ ] No breaking changes?
- [ ] If breaking: properly deprecated?
- [ ] Database migrations provided?

---

## 🗣️ How to Comment

### ✅ Constructive Comments

**Good:**
```
"This logic follows pattern X from lib/util.ts — nice consistency!"

"Consider using the existing helper from lib/cache.ts to avoid duplication."

"Question: This breaks backward compat with v1 clients. 
See CONTRIBUTING.md for how to deprecate. Want me to help?"
```

**Why:** Clear, specific, helpful.

### ❌ Unconstructive Comments

**Bad:**
```
"Bad code"
"This is wrong"
"I don't like this"
```

**Why:** Not specific, not helpful.

---

## 🔄 Approval Decision

### ✅ Approve When:
- Tests present & passing
- Coverage >80%
- No security issues
- Follows standards
- Backward compatible
- PR description explains changes

### 🔄 Request Changes When:
- Tests missing or failing
- Coverage <80%
- Security issues found
- Doesn't follow standards
- Breaking changes without deprecation
- Unclear code

### ❌ Reject Only When:
- Violates Rule Zero
- Critical security issue
- Breaks production
- Violates hard stops

---

## 🚦 Comment Examples

### Approve with Minor Comments
```
Looks good! A few suggestions:

1. Consider adding unit test for edge case where qty > stock
   (not blocking, just nice-to-have)

2. Line 42: Typo in variable name `stk` → `stock`

Overall: Approved! Minor fixes above, then ready to merge.
```

### Request Changes
```
Good work on this! A few issues before approval:

BLOCKING:
- Tests missing for error path (when API returns 500)
- Coverage dropped from 85% → 72%

NON-BLOCKING:
- Consider using existing util from lib/stock.ts (line 15)
- Variable name could be clearer (qty_items → orderedQuantity)

Please address blocking issues, then I'll re-review.
```

---

## ⏱️ Response Times

- First review: <24 hours
- Follow-up review: <24 hours
- If urgent: Mark as "URGENT" in comment

---

## 🤝 During Review Discussion

**If reviewer unclear:**
> "Can you explain why you chose this approach over X?"

**If author disagrees:**
> "I see your point. Let's discuss in the PR."
> [Both explain reasoning]
> [Lead dev decides if needed]

**If code is right but style is wrong:**
> "This is right, but doesn't follow pattern X from lib/util.ts.
> Can you align with existing codebase?"

---

## 🎯 Review Priority

| Type | Review By | Time |
|------|-----------|------|
| Blocking bug | Today | <4 hours |
| Feature | @qa-agent + @dev-lead | <24 hours |
| Tests | @qa-agent first | <24 hours |
| Docs | Any agent | <48 hours |

---

## After Approval

1. Author addresses all feedback
2. You re-review changes
3. You approve again
4. Author merges (or lead merges if needed)

---

**Next:** See [Human Checkpoint Protocol](./human-checkpoint.md) for when to ask for help during review

**Questions?** Check [FAQ](../quick-lookup/FAQ.md)
