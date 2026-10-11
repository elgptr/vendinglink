import { getCategoryAnchorId } from "@/lib/catalogGrouping";
import { getCategoryTheme } from "@/lib/categoryTheme";
import CustomerProductCard from "./CustomerProductCard";
import type { CategoryGroup } from "@/lib/catalogGrouping";

interface CategorySectionProps {
  group: CategoryGroup;
  /** Rank 0 is the top/best-selling category and gets a featured first card. */
  isTopRanked?: boolean;
}

export default function CategorySection({ group, isTopRanked = false }: CategorySectionProps) {
  const theme = getCategoryTheme(group.categorySlug);
  const sectionId = getCategoryAnchorId(group.categorySlug);

  const metaItems = [
    `${group.meta.productCount} produk`,
    `${group.meta.totalStock} stok siap kirim`,
  ];

  // Layout intent: top category gets a bento-style featured cell so the page
  // has a clear focal point. Subsequent categories use a uniform 2-col grid.
  const gridClass = isTopRanked
    ? "grid grid-cols-1 md:grid-cols-2 gap-5"
    : "grid grid-cols-1 sm:grid-cols-2 gap-5";

  return (
    <section
      id={sectionId}
      aria-labelledby={`${sectionId}-heading`}
      className="relative scroll-mt-8"
    >
      {/* Category wash: single-tone transparent gradient, no blur/blob. */}
      <div
        className={`pointer-events-none absolute inset-x-0 -top-8 bottom-0 bg-gradient-to-b ${theme.washFrom} to-transparent`}
        aria-hidden="true"
      />

      {/* Hairline divider with accent-leading segment. */}
      <div className="relative" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
        <div
          className={`absolute left-0 top-0 h-px w-16 bg-gradient-to-r ${theme.ruleFrom} to-transparent`}
        />
      </div>

      <div className="relative pt-10 sm:pt-12">
        {/* Eyebrow + heading */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${theme.accentDot}`} aria-hidden="true" />
            <span
              className={`text-xs font-bold uppercase tracking-[0.04em] ${theme.accentText}`}
            >
              {group.categoryName}
            </span>
          </div>
          <h3
            id={`${sectionId}-heading`}
            className="text-xl sm:text-2xl font-medium text-white tracking-tight"
          >
            {group.categoryName}
          </h3>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-slate-400">
            <p className="max-w-2xl leading-relaxed">{theme.tagline}</p>
            <span className="hidden sm:block text-surface-border-light" aria-hidden="true">
              ·
            </span>
            <p className="tabular-nums text-slate-500">{metaItems.join(" · ")}</p>
          </div>
        </div>

        {/* Product grid */}
        <div className={gridClass}>
          {group.products.map((product, index) => (
            <CustomerProductCard
              key={product.id}
              product={product}
              index={index}
              accentBorder={theme.cardHoverBorder}
              featured={isTopRanked && index === 0}
              className={isTopRanked && index === 0 ? "md:col-span-2" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
