import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Navigate between sections at the top, matching the prototype's behavior. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
