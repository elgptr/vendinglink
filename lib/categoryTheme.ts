/**
 * Category theme tokens.
 *
 * We deliberately keep this in code rather than the database for now.
 * Adding columns to `Category` (colorKey, tagline, sortOrder) is the
 * natural migration once the catalog stabilises; this module is shaped
 * so that switch only requires replacing the fallback path.
 *
 * Anti-slop guardrails:
 * - Brand acid yellow is reserved for CTAs, never used as a category hue.
 * - Emerald/amber/red are reserved for stock-status semantics.
 * - Purple/indigo are not the default; cyan is used for the AI category
 *   because "compute/signal" is semantically appropriate, not because it
 *   is the safest AI-output choice.
 */

export interface CategoryTheme {
  /** Tailwind text-* class for the eyebrow label and metadata links. */
  accentText: string;
  /** Tailwind bg-* class for the eyebrow dot. */
  accentDot: string;
  /** Gradient from-stop for the category divider accent segment (low opacity). */
  ruleFrom: string;
  /** Gradient to-stop for the category wash (very low opacity, transparent end). */
  washFrom: string;
  /** Tailwind border-* class applied on card hover. */
  cardHoverBorder: string;
  /** Short tagline shown beneath the category title. */
  tagline: string;
}

const explicitThemes: Record<string, CategoryTheme> = {
  "ai-tools": {
    accentText: "text-cyan-300",
    accentDot: "bg-cyan-400",
    ruleFrom: "from-cyan-400/40",
    washFrom: "from-cyan-500/[0.06]",
    cardHoverBorder: "hover:border-cyan-400/30",
    tagline: "Token API, model premium, dan alat produktivitas AI.",
  },
  subscription: {
    accentText: "text-orange-400",
    accentDot: "bg-orange-400",
    ruleFrom: "from-orange-400/40",
    washFrom: "from-orange-500/[0.06]",
    cardHoverBorder: "hover:border-orange-400/30",
    tagline: "Langganan bulanan dan akses premium untuk platform digital.",
  },
  "voucher-game": {
    accentText: "text-rose-400",
    accentDot: "bg-rose-400",
    ruleFrom: "from-rose-400/40",
    washFrom: "from-rose-500/[0.06]",
    cardHoverBorder: "hover:border-rose-400/30",
    tagline: "Voucher dan top-up untuk game serta entertainment.",
  },
};

/**
 * Deterministic fallback palette for categories that are not yet curated.
 * Hashing the slug guarantees the same category always receives the same
 * colour, avoiding random rainbow drift when products are added by admin UI.
 */
const fallbackPalette: CategoryTheme[] = [
  {
    accentText: "text-sky-400",
    accentDot: "bg-sky-400",
    ruleFrom: "from-sky-400/40",
    washFrom: "from-sky-500/[0.06]",
    cardHoverBorder: "hover:border-sky-400/30",
    tagline: "Produk digital pilihan.",
  },
  {
    accentText: "text-indigo-300",
    accentDot: "bg-indigo-400",
    ruleFrom: "from-indigo-400/40",
    washFrom: "from-indigo-500/[0.06]",
    cardHoverBorder: "hover:border-indigo-400/30",
    tagline: "Produk digital pilihan.",
  },
  {
    accentText: "text-teal-300",
    accentDot: "bg-teal-400",
    ruleFrom: "from-teal-400/40",
    washFrom: "from-teal-500/[0.06]",
    cardHoverBorder: "hover:border-teal-400/30",
    tagline: "Produk digital pilihan.",
  },
];

const uncategorizedTheme: CategoryTheme = {
  accentText: "text-slate-400",
  accentDot: "bg-slate-400",
  ruleFrom: "from-slate-400/30",
  washFrom: "from-slate-500/[0.03]",
  cardHoverBorder: "hover:border-slate-400/20",
  tagline: "Produk lain yang tersedia saat ini.",
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCategoryTheme(slug: string | null | undefined): CategoryTheme {
  if (!slug) return uncategorizedTheme;
  const normalised = slug.toLowerCase().trim();
  if (explicitThemes[normalised]) return explicitThemes[normalised];
  const index = hashString(normalised) % fallbackPalette.length;
  return fallbackPalette[index];
}

export function getCategoryThemeName(name: string): CategoryTheme {
  if (!name) return uncategorizedTheme;
  const normalised = name.toLowerCase().trim().replace(/\s+/g, "-");
  return getCategoryTheme(normalised);
}
