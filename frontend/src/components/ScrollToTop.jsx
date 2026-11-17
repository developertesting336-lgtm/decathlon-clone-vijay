import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Force browser to disable automatic scroll restoration globally
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Ensure manual scroll restoration stays active
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const scrollToTopImmediate = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // 1. Immediate scroll reset
    scrollToTopImmediate();

    // 2. Next animation frame to counter late renders
    const rAf = requestAnimationFrame(scrollToTopImmediate);

    // 3. Short timeouts to guarantee position when sub-components finish layout
    const timer50 = setTimeout(scrollToTopImmediate, 50);
    const timer150 = setTimeout(scrollToTopImmediate, 150);

    return () => {
      cancelAnimationFrame(rAf);
      clearTimeout(timer50);
      clearTimeout(timer150);
    };
  }, [pathname, search]);

  useEffect(() => {
    const handlePageShow = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("load", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("load", handlePageShow);
    };
  }, []);

  return null;
};

export default ScrollToTop;
