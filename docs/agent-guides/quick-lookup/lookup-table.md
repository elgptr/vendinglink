# 🔍 Quick Lookup: "Where to Find X?"

Can't find what you're looking for? Search here.

---

## 💻 Development

| Question | Answer |
|----------|--------|
| How do I set up my local environment? | [Development Setup](../../guides/development-setup.md) |
| How do I start the dev server? | `npm run dev` → http://localhost:3000 |
| What's the project structure? | [Directory Structure](../conventions/directory-structure.md) |
| Where are API endpoints? | `/app/api/` |
| Where is business logic? | `/lib/` |
| Where are utilities? | `/lib/utils/` |
| How do I create a new API route? | See example in `/app/api/admin/` |

---

## 🌿 Git Workflow

| Question | Answer |
|----------|--------|
| What branch naming should I use? | [Naming Conventions](../conventions/naming-conventions.md) |
| How do I create a branch? | `git checkout -b feat/yourname/description` |
| How do I commit? | `git commit -m "type: description (why)"` |
| How do I push? | `git push -u origin branch-name` |
| How do I create a PR? | Push → GitHub → "Create Pull Request" |
| Who reviews my code? | @dev-agent + @lead-dev |

---

## 🧪 Testing

| Question | Answer |
|----------|--------|
| How do I run tests? | `npm run test:run` (all), `npm run test:e2e` (E2E) |
| Where are unit tests? | `/__tests__/lib/` |
| Where are integration tests? | `/__tests__/api/` |
| Where are E2E tests? | `/e2e/` |
| What test framework? | [Vitest](https://vitest.dev) (unit/integration) & [Playwright](https://playwright.dev) (E2E) |
| What's coverage target? | >80% |
| How do I write a unit test? | See examples in `/__tests__/lib/` |
| How do I write an integration test? | See examples in `/__tests__/api/` |

---

## 📚 Documentation

| Question | Answer |
|----------|--------|
| System design overview? | [System Design](../../architecture/system-design.md) |
| API documentation? | [API Architecture](../../architecture/api-architecture.md) |
| Database schema? | [Database Schema](../../architecture/database-schema.md) |
| Tech stack? | [Tech Stack](../../architecture/tech-stack.md) |
| Product requirements? | [PRD](../../reference/PRD.md) |
| Code style guide? | [Code Standards](../conventions/code-standards.md) |
| My role & responsibilities? | [Dev Agent](../roles/dev-agent.md) or [QA Agent](../roles/qa-agent.md) |

---

## 🚀 Deployment & Operations

| Question | Answer |
|----------|--------|
| How do I deploy? | [Deployment Process](../../operations/deployment-process.md) |
| CI/CD pipeline? | [CI/CD Pipeline](../../operations/ci-cd-pipeline.md) |
| How do I check logs? | [Monitoring](../../operations/monitoring.md) |
| Something broke, what do I do? | [Incident Response](../../operations/incident-response.md) |

---

## 🤖 Agent Onboarding

| Question | Answer |
|----------|--------|
| I'm new, where do I start? | [Agent Guides README](../README.md) |
| What are the non-negotiable rules? | [Agent Rules](../agent-rules.md) |
| What's my role? | [Dev Agent](../roles/dev-agent.md) or [QA Agent](../roles/qa-agent.md) |
| How do I approach tasks? | [Planning Protocol](../protocols/planning-protocol.md) |
| When do I ask for help? | [Checkpoint Protocol](../protocols/human-checkpoint.md) |
| How do I review code? | [Review Protocol](../protocols/review-protocol.md) |
| Who do I contact for what? | [Interaction Matrix](../protocols/interaction-matrix.md) |

---

## ❓ Common Questions

| Question | Answer |
|----------|--------|
| What if tests fail locally? | Check error message, reproduce, add logging, checkpoint if stuck >30 min |
| What if I broke something? | Stop, alert @lead-dev, investigate, fix with tests |
| What if I don't understand a requirement? | Ask for clarification (don't assume) |
| Can I skip tests? | No. Tests are not optional |
| Can I push to main? | No. Always use feature branch + PR |
| Can I commit secrets? | No. Use .env + secrets manager |
| Can I use `any` type? | No (almost never). Use proper types |
| When do I checkpoint? | When confidence <80%, multiple options, or major changes |

---

## 📞 Who to Ask

| Topic | Contact | Channel |
|-------|---------|---------|
| Code questions | @dev-agent | PR comment |
| Test questions | @qa-agent | PR comment |
| Architecture | @lead-dev | Issue/PR comment |
| Blocking issue | @lead-dev | Slack #dev |
| General question | Team | #dev or #engineering |

---

**Still can't find it?** Check [FAQ](./FAQ.md) or request checkpoint!
