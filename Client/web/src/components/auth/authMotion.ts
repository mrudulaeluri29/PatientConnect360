import type { NavigateFunction, NavigateOptions, To } from "react-router";

type TransitionCapableDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function runViewTransition(action: () => void) {
  const doc = document as TransitionCapableDocument;

  if (typeof document === "undefined" || prefersReducedMotion() || typeof doc.startViewTransition !== "function") {
    action();
    return;
  }

  doc.startViewTransition(() => {
    action();
  });
}

export function navigateWithViewTransition(
  navigate: NavigateFunction,
  to: To,
  options?: NavigateOptions,
) {
  runViewTransition(() => navigate(to, options));
}
