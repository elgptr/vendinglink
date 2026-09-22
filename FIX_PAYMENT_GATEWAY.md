# 🔧 Fix Payment Gateway: Kasera Tidak Persist di Vercel

## Problem
Setelah deploy ke Vercel, payment gateway **selalu balik ke Midtrans** meskipun sudah setting ke Kasera di admin panel.

## Root Cause
Di `lib/paymentConfig.ts`, priority logic:
1. File `/tmp/vendinglink-gateway.json` (hilang saat cold start)
2. File `.gateway-setting.json` (tidak ada di Vercel)
3. Environment variable `PAYMENT_GATEWAY` ← **BELUM DISET**
4. Default fallback: `MIDTRANS` ← masalahnya di sini

Setiap cold start serverless function, file di `/tmp` hilang dan langsung fallback ke Midtrans.

## ✅ Solusi 1: Set Environment Variable di Vercel (RECOMMENDED)

### Step-by-step:

1. **Login ke Vercel Dashboard**
   - Buka: https://vercel.com/dashboard
   - Pilih project `vendinglink`

2. **Settings → Environment Variables**
   - Klik tab "Settings"
   - Pilih "Environment Variables"

3. **Add New Variable**
   ```
   Name: PAYMENT_GATEWAY
   Value: KASERA
   Environment: Production, Preview, Development (pilih semua)
   ```

4. **Redeploy**
   - Klik "Deployments" tab
   - Pilih latest deployment
   - Klik "..." (three dots) → "Redeploy"
   - Atau push commit baru ke GitHub

5. **Verify**
   - Setelah deploy selesai, test checkout
   - Gateway akan persist ke KASERA

---

## ✅ Solusi 2: Update Code (Backup Plan)

Kalau mau hardcode default ke KASERA (tapi kurang flexible):

### Edit `lib/paymentConfig.ts` line 68:

**SEBELUM:**
```typescript
inMemoryGateway = "MIDTRANS";
return "MIDTRANS";
```

**SESUDAH:**
```typescript
inMemoryGateway = "KASERA";
return "KASERA";
```

Lalu commit dan push ke GitHub.

---

## 📊 Verification Checklist

Setelah fix, pastikan:

- [ ] Environment variable `PAYMENT_GATEWAY=KASERA` sudah ada di Vercel
- [ ] Redeploy berhasil
- [ ] Test customer checkout → harus muncul QRIS Kasera
- [ ] Test agent checkout → harus muncul QRIS Kasera
- [ ] Admin panel → payment gateway setting tetap Kasera setelah refresh

---

## 🔍 Debug Command (Jika Masih Gagal)

Check environment variable di Vercel production:

1. Di Vercel Dashboard → Project → Settings → Environment Variables
2. Pastikan `PAYMENT_GATEWAY` ada dan value-nya `KASERA`
3. Pastikan environment scope-nya `Production` tercentang

---

## 💡 Bonus: Midtrans Business Review Lama

Lu bilang Midtrans review udah 3 minggu ga selesai? Emang normal, kadang:
- Sandbox mode: instant approval
- Production mode: 1-4 minggu (tergantung dokumen & bisnis model)

Saran:
1. Check email dari Midtrans, kadang mereka minta dokumen tambahan
2. Contact support via dashboard atau WhatsApp
3. Sementara pake Kasera dulu (udah working kan)

---

Selesai! Mau gw bantu set via Vercel CLI atau lu mau manual di dashboard?
