import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  LayoutGrid,
  Lightbulb,
  Settings,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { useAppData } from "../../hooks/useAppData";
import { latestWeighIn } from "../../lib/analytics/weights";
import { goalProgress } from "../../lib/analytics/goal";
import { formatWeight } from "../../lib/units";

const WORKSPACE_NAV = [
  { to: "/overview", label: "Overview", Icon: LayoutGrid },
  { to: "/journal", label: "Daily journal", Icon: CalendarDays },
  { to: "/progress", label: "Weight progress", Icon: TrendingUp },
  { to: "/meals", label: "Meal routine", Icon: UtensilsCrossed },
  { to: "/insights", label: "Insights", Icon: Lightbulb },
];

export function Sidebar() {
  const { snapshot, storageKind } = useAppData();
  if (!snapshot) return null;
  const { settings } = snapshot;
  const latest = latestWeighIn(snapshot.weighIns);
  const progress = goalProgress(
    settings.startWeightKg,
    settings.goalWeightKg,
    latest?.weightKg ?? null,
  );

  return (
    <aside
      aria-label="STEADY navigation"
      className="flex shrink-0 flex-col border-b border-edge bg-white px-4 pb-5 pt-3 lg:sticky lg:top-0 lg:h-screen lg:w-[254px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:pt-[30px]"
    >
      <div className="flex items-center gap-[11px] px-[13px] pb-4 pt-2 lg:pb-[29px] lg:pt-0">
        <div className="grid h-[37px] w-[37px] shrink-0 place-items-center rounded-[13px] bg-[#125a49] text-[22px] font-extrabold tracking-[-2px] text-white">
          s.
        </div>
        <div>
          <div className="text-[21px] font-extrabold leading-none tracking-[-0.85px] text-ink">
            steady<span className="text-forest">.</span>
          </div>
          <div className="mt-[5px] text-[10px] font-bold uppercase tracking-[1.45px] text-muted">
            Progress Studio
          </div>
        </div>
      </div>

      <div className="hidden nav-head lg:block">Workspace</div>
      <nav
        className="flex gap-1 overflow-x-auto pb-1 lg:block lg:overflow-visible lg:pb-0"
        aria-label="Main"
      >
        {WORKSPACE_NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-link shrink-0 lg:shrink ${isActive ? "" : ""}`
            }
          >
            <Icon aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
        <div className="nav-head hidden lg:block">Preferences</div>
        <NavLink to="/settings" className="nav-link shrink-0 lg:shrink">
          <Settings aria-hidden="true" />
          <span className="whitespace-nowrap">Settings</span>
        </NavLink>
      </nav>

      <div className="mt-auto hidden px-2.5 pt-8 lg:block">
        <div className="rounded-2xl border border-[#d9ecdf] bg-gradient-to-br from-[#e9f6ee] to-[#f4fbf6] p-[17px]">
          <div className="text-[11px] font-bold tracking-[0.3px] text-[#648173]">
            YOUR GOAL
          </div>
          {settings.goalWeightKg != null ? (
            <>
              <strong className="my-2 block text-[22px] font-extrabold tracking-[-0.7px] text-ink">
                {formatWeight(settings.goalWeightKg, settings.unit)}
              </strong>
              <div
                className="h-[7px] overflow-hidden rounded-[7px] bg-[#d1e7d8]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress?.percent ?? 0)}
                aria-label="Progress toward your goal weight"
              >
                <span
                  className="block h-full rounded-[7px] bg-forest transition-[width] duration-500"
                  style={{ width: `${progress?.percent ?? 0}%` }}
                />
              </div>
              <small className="mt-2.5 block text-[11px] leading-snug text-[#718b7e]">
                {progress
                  ? `${Math.round(progress.percent)}% toward your target`
                  : "Start with your first weigh-in"}
              </small>
            </>
          ) : (
            <>
              <strong className="my-2 block text-[17px] font-extrabold tracking-[-0.4px] text-ink">
                Set a destination
              </strong>
              <p className="text-[11px] leading-snug text-[#718b7e]">
                Add a starting weight and target in Settings.
              </p>
              <NavLink
                to="/settings"
                className="mt-2 inline-block text-[11px] font-bold text-forest hover:underline"
              >
                Set your goal →
              </NavLink>
            </>
          )}
        </div>
        <p className="px-[11px] pt-[18px] text-[10px] leading-relaxed text-[#a4aca7]">
          Private by design · saved on this device
          <br />
          {storageKind === "sqlite" ? "STEADY DESKTOP / 1.0" : "STEADY PREVIEW / 1.0"}
        </p>
      </div>
    </aside>
  );
}
