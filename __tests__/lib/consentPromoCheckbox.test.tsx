import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ConsentPromoCheckbox from "@/components/customer/ConsentPromoCheckbox";

describe("consent promo checkbox (ST-1b-2)", () => {
  it("renders checked consent copy without dangling warning reference", () => {
    const html = renderToStaticMarkup(createElement(ConsentPromoCheckbox, { checked: true, onChange: vi.fn() }));
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toContain("riwayat pembelian");
    expect(html).toContain("kode referral pribadi");
    expect(html).toContain("program marketing dari txsiber");
    expect(html).toContain("text-xs text-slate-400");
    expect(html).not.toContain("customer-consent-promo-warning");
  });

  it("displays an inline accessible benefit warning when unchecked", () => {
    const html = renderToStaticMarkup(createElement(ConsentPromoCheckbox, { checked: false, onChange: vi.fn() }));
    expect(html).not.toContain('checked=""');
    expect(html).toContain('aria-describedby="customer-consent-promo-warning"');
    expect(html).toContain('id="customer-consent-promo-warning"');
    expect(html).toContain('role="status"');
    expect(html).toContain("tidak akan mendapat");
    expect(html).toContain("benefit kode referral");
    expect(html).toContain("text-xs text-slate-400");
  });
});