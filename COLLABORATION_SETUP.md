# Git Collaboration Setup — Model Track Paralel ✅

Setup kolaborasi 3 developer untuk kerja **bersamaan, tanpa saling menunggu**.

---

## Kenapa Diubah dari Model "Stage" Sebelumnya?

Model "Stage 1 → 2 → 3 → ... → 6" secara desain membuat dev di stage belakang harus menunggu dev di stage depan selesai — padahal banyak yang secara teknis tidak saling bergantung. Sekarang dipecah jadi **3 Track paralel**, masing-masing dengan file yang sama sekali berbeda, sehingga bisa dikerjakan bersamaan mulai sekarang.

---

## 📋 Files

| File | Isi |
|------|-----|
| `TASK_ASSIGNMENT.md` | Pembagian 3 track + files owned masing-masing |
| `CONTRIBUTING.md` | Workflow harian, branching model, conflict handling |
| `.github/BRANCHING_STRATEGY.md` | Quick start & FAQ |
| `.github/PULL_REQUEST_TEMPLATE.md` | Template PR |
| `.github/DEVELOPER_SETUP.md` | Setup lokal |
| `.github/CODEOWNERS` | Auto-assign reviewer |
| `.github/workflows/ci.yml` | CI build & lint |

---

## 🎯 3 Track — Bisa Mulai Bersamaan Sekarang

| Track | Fokus | Owner |
|-------|-------|-------|
| A | Agent Checkout UX (sambungkan ke `/api/checkout/agent`) | @dev-elang |
| B | Agent Registration, Approval & Debt Settlement | @dev-jiwo |
| C | Product Guide Image & Inventory | @dev-iqbal |

Detail files & deliverables lengkap: `TASK_ASSIGNMENT.md`.

**Tidak ada dependency antar track** — semua bisa branch dari `main` dan mulai kerja hari ini juga.

---

## 🚀 Setup Sekali Saja (Admin)

1. **Branch protection** untuk `main` — lihat `.github/BRANCHING_STRATEGY.md`
2. **Update nama developer** di `TASK_ASSIGNMENT.md`
3. **Share dokumen** ke tim

---

## Workflow Ringkas per Developer

```bash
git checkout main && git pull origin main
git checkout -b feat/dev-yourname/track-x-feature-name

# kerja di file milik track kamu, commit sering
git add . && git commit -m "..." && git push

# sebelum PR
git fetch origin && git rebase origin/main && git push --force-with-lease

# buka PR ke main, assign reviewer, merge setelah approve
# TIDAK PERLU tunggu track lain
```

---

## ✅ Kenapa Ini Anti-Tunggu-Tungguan

- 1 branch utama (`main`), tidak ada tier `dev`/`staging` yang bikin antrian integrasi
- 3 track = 3 area file yang benar-benar terpisah, dicek langsung dari kode (bukan asumsi)
- Merge PR begitu approved, tidak perlu sinkron dengan PR track lain
- Satu-satunya "file hangat" (`middleware.ts`, `lib/auth.ts`) cuma disentuh Track B — Track A/C tidak pernah menyentuhnya sama sekali

---

**Setup Date:** 2026-09-07
**Version:** 2.0 — Track paralel, anti saling-tunggu
