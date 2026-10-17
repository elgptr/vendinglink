# ❓ Agent FAQ - Quick Answers

**Got a question? Find it here.**

---

## Getting Started

**Q: Where do I start?**
A: [Agent Guides README](../README.md) → [Agent Rules](../agent-rules.md) → Your role guide

**Q: Dev Agent or QA Agent?**
A: [Dev Agent](../roles/dev-agent.md) writes code. [QA Agent](../roles/qa-agent.md) writes tests.

---

## Git & Code

**Q: What branch should I use?**
A: `feat/yourname/feature` or `test/yourname/test`

**Q: Can I push to main?**
A: **NO!** Always use feature branch + PR + approval.

**Q: How detailed should commit messages be?**
A: Explain WHAT and WHY.
```
✅ feat: add batch stock claim (fixes race condition)
❌ update
```

---

## Testing

**Q: How many tests should I write?**
A: Cover happy path, edge cases, errors. Target >80% coverage.

**Q: Should I test third-party libraries?**
A: **No!** Mock them. Only test YOUR code.

**Q: My test always passes. Is that OK?**
A: **No!** Verify it fails without your fix.

---

## Checkpoint & Help

**Q: When do I need a checkpoint?**
A: When uncertain, multiple options, or database changes. See [Human Checkpoint](../protocols/human-checkpoint.md)

**Q: How long for approval?**
A: Usually <2 hours.

**Q: I don't understand the requirement.**
A: Ask! Better to ask than assume wrong.

---

## Code Quality

**Q: What code style?**
A: See [Coding Standards](../conventions/code-standards.md)

**Q: Can I use `any` type?**
A: **Never!** Use proper types.

**Q: Code fails locally, breaks CI. What do I do?**
A: Diagnose locally first. Stuck >30 min? Checkpoint.

---

## Reviews

**Q: PR rejected. What now?**
A: Read feedback, fix issues or explain, resubmit.

**Q: Can I approve my own PR?**
A: **No!** Get approval from another agent or human.

---

## Errors & Debugging

**Q: I broke something.**
A: Stop, alert @lead-dev, investigate, fix with tests.

**Q: Tests fail, don't know why.**
A: Read error message. Try locally. Add logging. Checkpoint if stuck.

---

## Team

**Q: Who reviews my code?**
A: @dev-agent + @lead-dev

**Q: Who reviews my tests?**
A: @qa-agent + @dev-agent

**Q: Stuck? Who to ask?**
A: Request checkpoint with details.

---

## On-Demand Pre-Order & Live Tracking

**Q: How does pre-order live tracking work without login?**
A: Each pre-order generates an opaque cryptographic tracking token (`trk_...`). The route `/pre-order/track/[trackingToken]` and API `/api/customer/product-requests/track/*` are whitelisted as public routes in `lib/routeProtection.ts`. The link is delivered directly to the customer's WhatsApp via SaungWA.

**Q: What price does the customer pay for a pre-order item?**
A: **Always the catalog retail price (`product.price`)!** Never charge `quotedPrice` (supplier wholesale cost). The UI displays a marketing anchor with an automated 40% strikethrough discount calculated by `getPreOrderDisplayPrices(product.price)`.

**Q: What happens if a customer requests a product that already has stock?**
A: `checkExistingStockRedirect()` in `lib/guards/preorderGuard.ts` detects existing `AVAILABLE` items in `RedeemStock`. It rejects the pre-order with a redirect hint, guiding the customer directly to checkout.

**Q: Can a customer create multiple pre-orders at once?**
A: No. `getActivePreOrderForPhone()` enforces a hard limit of 1 active pre-order (`PENDING_SOURCING`, `AGENT_PURCHASING`, or `STOCKED`) per customer phone number. Subsequent requests return HTTP 409 Conflict until the active order is resolved.

**Q: Why do we call the agent "bagian Purchasing kami" instead of "Hermes"?**
A: To provide a clean, human-centric, and non-confusing customer experience. Technical agent names, architecture codenames, or AI prompt jargon must remain internal.

---

## Common Mistakes

**Q: I skipped tests. OK?**
A: **No!** Tests are NOT optional.

**Q: I pushed to main. What do I do?**
A: Alert @lead-dev. Use feature branch going forward.

**Q: I built wrong thing. What do I do?**
A: Tell @lead-dev. Ask clarifying questions FIRST next time.

---

**Still need help?** Check [Quick Lookup](./lookup-table.md) or request checkpoint!
