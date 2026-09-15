# 🛑 Human Checkpoint Protocol: When & How to Ask

Knowing when to ask for help is wisdom.

---

## ✅ When to Request Checkpoint

### 🔴 **Request Immediately**
- [ ] Breaking API changes
- [ ] Database schema changes
- [ ] Security-sensitive code
- [ ] Uncertainty (confidence <80%)

### 🟡 **Request Before Starting**
- [ ] Multiple valid approaches
- [ ] External service integration
- [ ] Major refactoring (>200 LOC)

### 🟢 **Can Proceed**
- [ ] Bug fix following existing pattern
- [ ] Small feature (standard approach)
- [ ] Tests for existing code

---

## 📋 **How to Request**

### Prepare Context
```
What are you building?
Why are you doing it?
What have you already tried?
What are you uncertain about?
What options are you considering?
```

### Post Clear Question

Channel by urgency:
- **Blocking** → @lead-dev in #dev (expect <30 min)
- **Important** → Comment on issue (expect <2 hours)
- **Standard** → #engineering (expect <24 hours)

---

## 🔄 **What Happens**

### If Approved
✅ "Good approach, proceed"

### If Alternative Suggested
🔄 "Try approach B instead"

### If Rejected
❌ "Don't do this, let's redesign"

---

## ⏱️ **Response Times**

| Type | Expected | Max |
|------|----------|-----|
| Urgent | 15-30 min | 1 hour |
| Important | <2 hours | 4 hours |
| Standard | <24 hours | 48 hours |

---

## 🎯 **Decision Matrix**

```
Am I >80% confident? YES → Can I revert? YES → Proceed
                        NO → Checkpoint
NO → Need guidance? YES → Checkpoint
```

---

**See Also:** [Planning Protocol](./planning-protocol.md) | [FAQ](../quick-lookup/FAQ.md)
