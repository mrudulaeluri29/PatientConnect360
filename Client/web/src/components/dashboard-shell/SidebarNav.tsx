import type { SidebarNavGroup } from "./shellTypes";

interface SidebarNavProps {
  navGroups: SidebarNavGroup[];
  activeItem: string;
  onSelectItem: (itemId: string) => void;
  compact?: boolean;
}

export default function SidebarNav({ navGroups, activeItem, onSelectItem, compact = false }: SidebarNavProps) {
  return (
    <nav className={`dashboard-sidebar-nav ${compact ? "dashboard-sidebar-nav--compact" : ""}`} aria-label="Dashboard navigation">
      {navGroups.map((group) => (
        <section className="dashboard-sidebar-nav__group" key={group.id}>
          <h2 className="dashboard-sidebar-nav__group-title">{group.label}</h2>
          <div className="dashboard-sidebar-nav__items">
            {group.items.map((item) => {
              const isActive = item.id === activeItem;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-tab={item.id}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "dashboard-sidebar-nav__item",
                    isActive ? "is-active" : "",
                    item.priority === "high" ? "is-priority" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onSelectItem(item.id)}
                >
                  <span className="dashboard-sidebar-nav__item-label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
