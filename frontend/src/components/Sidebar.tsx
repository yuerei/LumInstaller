import type { ReactNode } from "react";
import { Settings, Package, Wrench } from "lucide-react";

export type Tab = "catalog" | "patch" | "settings";

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-brand/15 text-brand"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1.5 pt-3 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground first:pt-1">
      {children}
    </p>
  );
}

export function Sidebar({
  active,
  version,
  onNavigate,
}: {
  active: Tab;
  version: string;
  onNavigate: (tab: Tab) => void;
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <Package className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-none tracking-tight text-foreground">
              LumInstaller
            </h1>
            <p className="mt-1 text-[11px] leading-none text-muted-foreground">
              Mod &amp; patch installer
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <SectionLabel>Library</SectionLabel>
        <NavItem
          icon={<Package className="size-4" />}
          label="Catalog"
          active={active === "catalog"}
          onClick={() => onNavigate("catalog")}
        />
        <NavItem
          icon={<Wrench className="size-4" />}
          label="Patch"
          active={active === "patch"}
          onClick={() => onNavigate("patch")}
        />
        <SectionLabel>Configure</SectionLabel>
        <NavItem
          icon={<Settings className="size-4" />}
          label="Settings"
          active={active === "settings"}
          onClick={() => onNavigate("settings")}
        />
      </nav>

      <div className="border-t border-border p-4 text-[11px] text-muted-foreground">
        v{version || "0.1.0"}
      </div>
    </aside>
  );
}
