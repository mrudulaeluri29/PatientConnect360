import { useEffect, useRef } from "react";

/**
 * Re-runs the callback on mount, when the document becomes visible, and on a timer.
 * Keeps role dashboards aligned without websockets (shared polling + tab focus).
 */
export function useRefetchOnIntervalAndFocus(
  callback: () => void | Promise<void>,
  intervalMs = 30000
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const run = () => {
      void cbRef.current();
    };

    run();
    const timer = window.setInterval(run, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
