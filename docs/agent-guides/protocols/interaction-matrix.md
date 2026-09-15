# 👥 Team Interaction Matrix

Who to ask for what.

---

## 👨‍💼 Team Roles

| Role | Responsibilities | Contact | Hours |
|------|------------------|---------|-------|
| **Lead Dev** (@lead-dev) | Architecture, major decisions, blocking issues | Slack / @mention | Business hours |
| **Dev Agent** (@dev-agent) | Code, features, bug fixes | PR comments | On demand |
| **QA Agent** (@qa-agent) | Testing, quality, verification | PR comments | On demand |

---

## 🔄 When to Contact Each

### Lead Dev (@lead-dev)

**Contact when:**
- ✅ Architecture questions
- ✅ Design decisions
- ✅ Major refactoring approval
- ✅ Breaking changes
- ✅ Blocking issues
- ✅ Disagreements between agents

**How:**
1. For blocking: Slack directly
2. For important: Comment on issue/PR
3. For standard: Post in #dev

**Response:** Usually <2 hours for blocking

---

### Dev Agent (@dev-agent)

**Contact for:**
- ✅ Code review
- ✅ Feature implementation questions
- ✅ Bug fixing approach
- ✅ Code pattern questions

**How:**
- Request in PR
- Tag in issue
- Slack for urgent

---

### QA Agent (@qa-agent)

**Contact for:**
- ✅ Test coverage questions
- ✅ Test patterns
- ✅ Test framework help
- ✅ QA approach

**How:**
- Request in PR
- Tag in issue
- Slack for urgent

---

## 📊 Communication Channels

| Channel | Use For | Response Time |
|---------|---------|----------------|
| **Slack #dev** | Urgent, blocking | <30 min |
| **PR comments** | Code questions | <2 hours |
| **GitHub issues** | Discussion, questions | <24 hours |
| **Slack DM** | Private questions | <1 hour |

---

## 🚦 Decision Authority

| Decision | Authority | Process |
|----------|-----------|---------|
| Feature design | Lead Dev | Checkpoint before code |
| Code approach | Dev Agent | PR review |
| Test approach | QA Agent | PR review |
| Architecture | Lead Dev | Checkpoint + approval |
| Naming/style | Team | PR review |
| Breaking changes | Lead Dev | Checkpoint + approval |

---

## 👥 Code Review Matrix

Who reviews what:

| Type | Reviewer 1 | Reviewer 2 | Approval |
|------|-----------|-----------|----------|
| **Feature** | @dev-agent | @lead-dev | Both |
| **Bug fix** | @dev-agent | @qa-agent | Both |
| **Tests** | @qa-agent | @dev-agent | Both |
| **Docs** | Any agent | - | 1 |
| **Refactor** | @dev-agent | @lead-dev | Both |

---

## 🎯 Quick Reference

**I have a question about:**

- Code? → @dev-agent
- Tests? → @qa-agent
- Design? → @lead-dev
- Urgent? → Slack #dev
- Architectural? → @lead-dev
- Blocking? → @lead-dev directly

---

**See Also:** [FAQ](../quick-lookup/FAQ.md) | [Checkpoint Protocol](./human-checkpoint.md)
