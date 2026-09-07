## 📋 Deskripsi

Jelaskan apa yang diubah dan why (singkat, jelas).

**Relates to:** #[issue-number] (jika ada)

**Track:** Track [A/B/C] — [nama fitur, lihat TASK_ASSIGNMENT.md]

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
- [ ] Code mengikuti naming conventions project
- [ ] Tidak ada `console.log`, debug code, atau commented-out logic
- [ ] Jika ada perubahan DB schema, sudah run `npx prisma db push` dan update seed jika perlu
- [ ] Jika ada env var baru, sudah update `.env.example`
- [ ] Jika ada dependency baru, sudah mendapat approval tech lead
- [ ] PR tidak memiliki conflict dengan `main` branch
- [ ] Tidak ada breaking changes untuk track lain yang sedang dikerjakan (lihat file ownership di `TASK_ASSIGNMENT.md`)

---

## 📊 Testing Notes

Jelaskan testing yang sudah dilakukan:

1. **Unit test:** [describe or N/A]
2. **Manual test:** [steps to reproduce, expected behavior]
3. **Edge cases:** [any edge cases tested]

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
**Target merge:** [date] — merge segera setelah approved, tidak perlu tunggu track lain

