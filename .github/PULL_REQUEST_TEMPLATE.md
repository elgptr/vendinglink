## 📋 Deskripsi

Jelaskan apa yang diubah dan why (singkat, jelas).

**Relates to:** #[issue-number] (jika ada)

**Track/Phase:** Track [A/B/C] OR Phase [1-5] - [nama fitur, lihat TASK_ASSIGNMENT.md]

---

## 🔧 Tipe Perubahan

- [ ] ✨ Feature baru
- [ ] 🐛 Bug fix
- [ ] 📝 Docs / copy update
- [ ] ♻️ Refactor / cleanup
- [ ] 🚀 Performance improvement

---

## ✅ Checklist

- [ ] Saya telah test perubahan ini lokal (`npm run build` dan `npm run lint` pass)
- [ ] `npm test` pass (after Phase 1 launch) OR N/A for pre-Phase-1 work
- [ ] Code mengikuti naming conventions project
- [ ] Tidak ada `console.log`, debug code, atau commented-out logic
- [ ] Jika ada perubahan DB schema, sudah run `npx prisma db push` dan update seed jika perlu
- [ ] Jika ada env var baru, sudah update `.env.example`
- [ ] Jika ada dependency baru, sudah mendapat approval tech lead (Phase 1 test deps pre-approved)
- [ ] PR tidak memiliki conflict dengan `main` branch
- [ ] Tidak ada breaking changes untuk track/phase lain yang sedang dikerjakan (lihat file ownership di `TASK_ASSIGNMENT.md`)
- [ ] **For Phase PRs:** Confirm all files edited are assigned to my role (see Phase assignment table)
- [ ] **For Phase PRs:** No edits to protected files for this phase (see Protected Files table)

---

## 📊 Testing Notes

Jelaskan testing yang sudah dilakukan:

1. **Unit test:** [describe or N/A] (after Phase 1 launch)
2. **Integration test:** [describe or N/A] (after Phase 1 launch)
3. **E2E test:** [describe or N/A] (if applicable, Playwright)
4. **Manual test:** [steps to reproduce, expected behavior]
5. **Edge cases:** [any edge cases tested]

---

## 🚨 Breaking Changes

- [ ] Tidak ada breaking changes
- [ ] Ada breaking changes:
  - Jelaskan perubahan apa
  - Impact ke track lain: ...
  - Action yang perlu dilakukan: ...

---

## 📦 Dependencies

- [ ] Tidak ada dependency baru
- [ ] Ada dependency baru: `pkg-name@^version` untuk [reason]
  - Linked to issue: #[number]

---

## 🔗 Review Focus

Fokus reviewer pada area ini:

- [ ] Code logic & correctness
- [ ] Error handling & edge cases
- [ ] Database queries (N+1, missing includes, etc.)
- [ ] Type safety & TypeScript
- [ ] Performance impact
- [ ] UI/UX (if frontend change)

---

## 📝 Notes untuk Reviewer

Tambahkan catatan yang penting untuk diperhatikan saat review.

---

**Reviewer Assignment:** @dev-name-1, @dev-name-2  
**Target merge:** [date] - For Track PRs: merge segera setelah approved, tidak perlu tunggu track lain. For Phase PRs: merge after approved, but ensure previous phases merged first.

