import { useLocation } from "react-router-dom";
import { CalendarDays, Download, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { useDialogs } from "../dialogs/DialogProvider";
import { useToday } from "../../hooks/useToday";
import { useAppData } from "../../hooks/useAppData";
import { formatLongDate } from "../../lib/dates";
import { useExports } from "../../features/useExports";

const PAGE_NAMES: Record<string, string> = {
  "/overview": "Overview",
  "/journal": "Daily journal",
  "/progress": "Weight progress",
  "/meals": "Meal routine",
  "/insights": "Insights",
  "/settings": "Settings",
};

export function Topbar() {
  const location = useLocation();
  const today = useToday();
  const { openWeight } = useDialogs();
  const { storageKind } = useAppData();
  const { exportCsv } = useExports();
  const pageName = PAGE_NAMES[location.pathname] ?? "Overview";

  return (
    <header className="flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-edge py-3 lg:h-[85px] lg:flex-nowrap lg:py-0">
      <div className="text-[12px] font-semibold text-muted">
        Personal workspace
        <span className="px-[7px] text-[#c6d2c8]">/</span>
        <strong className="font-bold text-forest">{pageName}</strong>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {storageKind === "browser" && (
          <span
            className="pill hidden border-[#f2e3cf] bg-[#fff6e9] text-[#996430] sm:inline-flex"
            title="Design preview in a browser. Data is stored in this browser only; the installed app uses SQLite."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#c48a4f]" aria-hidden="true" />
            Browser preview
          </span>
        )}
        <span className="pill hidden xl:inline-flex">
          <CalendarDays className="h-3.5 w-3.5 text-[#8fa198]" aria-hidden="true" />
          {formatLongDate(today)}
        </span>
        <Button onClick={exportCsv} title="Export your records as a CSV spreadsheet">
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export
        </Button>
        <Button variant="primary" onClick={() => openWeight(today)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Log weight
        </Button>
      </div>
    </header>
  );
}
