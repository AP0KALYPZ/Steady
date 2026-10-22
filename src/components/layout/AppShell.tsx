import { Outlet } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAppData } from "../../hooks/useAppData";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OnboardingDialog } from "../onboarding/OnboardingDialog";
import { ScrollToTop } from "./ScrollToTop";
import { Button } from "../ui/Button";

export function AppShell() {
  const { snapshot, isLoading, error, reload } = useAppData();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#125a49] text-[30px] font-extrabold tracking-[-2px] text-white">
            s.
          </div>
          <div>
            <div className="text-[16px] font-extrabold tracking-[-0.4px] text-ink">
              steady.
            </div>
            <p className="mt-1 text-[12px] text-muted">
              Opening your local progress studio…
            </p>
          </div>
          <div
            className="h-1 w-28 overflow-hidden rounded-full bg-[#e3ece5]"
            role="status"
            aria-label="Loading your local records"
          >
            <div className="h-full w-1/2 animate-pulse rounded-full bg-forest" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="surface w-full max-w-[520px] p-7">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#fcf3e8] text-amber">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.7px] text-ink">
            STEADY could not open its records
          </h1>
          <p className="mt-2 text-[12px] leading-relaxed text-[#8b9b92]">
            {error ??
              "The local database is unavailable. Your data has not been changed."}
          </p>
          <div className="mt-5 flex gap-2.5">
            <Button variant="primary" onClick={() => void reload()}>
              Try again
            </Button>
            <Button onClick={() => window.location.reload()}>Restart view</Button>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-[#99a69e]">
            If this continues, check that the app data folder is writable. Existing
            records remain in the local SQLite database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[254px_minmax(0,1fr)]">
      <ScrollToTop />
      <Sidebar />
      <main className="min-w-0 px-4 pb-10 sm:px-6 lg:px-6 lg:pb-12 wide:px-[37px]">
        <Topbar />
        <Outlet />
        <footer className="flex flex-wrap items-center justify-between gap-2 pt-7 text-[11px] text-[#a0aaa3]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#93a79b]" aria-hidden="true" />
            Your records stay on this device.
          </span>
          <span>STEADY · Progress Studio</span>
        </footer>
      </main>
      {!snapshot.settings.onboarded && <OnboardingDialog />}
    </div>
  );
}
