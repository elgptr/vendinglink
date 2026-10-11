import { getCategoryAnchorId } from "@/lib/catalogGrouping";
import { getCategoryTheme } from "@/lib/categoryTheme";
import type { CategoryGroup } from "@/lib/catalogGrouping";

interface CategoryNavProps {
  groups: CategoryGroup[];
}

export default function CategoryNav({ groups }: CategoryNavProps) {
  if (groups.length <= 1) return null;

  return (
    <nav aria-label="Lompat ke kategori" className="mb-10">
      <ul className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1">
        {groups.map((group) => {
          const theme = getCategoryTheme(group.categorySlug);
          const href = `#${getCategoryAnchorId(group.categorySlug)}`;

          return (
            <li key={group.categorySlug} className="flex-shrink-0">
              <a
                href={href}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-surface-border bg-surface-card/60 hover:bg-surface-hover hover:border-surface-border-light transition-colors ${theme.accentText}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${theme.accentDot}`} aria-hidden="true" />
                {group.categoryName}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
