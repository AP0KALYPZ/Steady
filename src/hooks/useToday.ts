import { useEffect, useState } from "react";
import { msUntilNextMidnight, todayKey } from "../lib/dates";

/** The local calendar date, refreshed at midnight and when the app resumes. */
export function useToday(): string {
  const [today, setToday] = useState<string>(() => todayKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => {
        setToday(todayKey());
        schedule();
      }, msUntilNextMidnight());
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setToday(todayKey());
      }
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return today;
}
