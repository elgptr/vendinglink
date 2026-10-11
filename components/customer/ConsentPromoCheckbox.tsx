interface ConsentPromoCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Inline, keyboard-accessible consent and benefit-loss warning (ST-1b-2). */
export default function ConsentPromoCheckbox({ checked, onChange }: ConsentPromoCheckboxProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="customer-consent-promo" className="flex items-start gap-3 cursor-pointer">
        <input
          id="customer-consent-promo"
          type="checkbox"
          checked={checked}
          aria-describedby={checked ? undefined : "customer-consent-promo-warning"}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-surface-border text-brand-500 focus:ring-brand-500/50 bg-surface-card cursor-pointer"
        />
        <span className="text-xs text-slate-400">
          Dengan mengisi nomor WhatsApp saya menyetujui data saya disimpan untuk
          riwayat pembelian, mendapatkan kode referral pribadi, dan menerima info
          program marketing dari txsiber — termasuk melalui WhatsApp.
        </span>
      </label>
      {!checked && (
        <p id="customer-consent-promo-warning" role="status" aria-live="polite" className="text-xs text-slate-400 pl-7">
          Jika tidak dicentang, pesanan tetap diproses tetapi Anda tidak akan mendapat
          riwayat pembelian dan benefit kode referral.
        </p>
      )}
    </div>
  );
}