import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll to top on route change. The authenticated app shell scrolls its
 * own #app-scroll-container (not the window), so both need resetting. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("app-scroll-container")?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
