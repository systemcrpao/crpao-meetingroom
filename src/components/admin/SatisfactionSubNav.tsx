import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "คะแนนและสถิติ", to: "/admin/satisfaction" },
  { title: "รายการตอบแบบประเมิน", to: "/admin/satisfaction/responses" },
];

export function SatisfactionSubNav() {
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/admin/satisfaction"}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          )}
          activeClassName="bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
        >
          {tab.title}
        </NavLink>
      ))}
    </nav>
  );
}
