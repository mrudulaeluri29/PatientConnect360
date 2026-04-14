import type { HTMLAttributes } from "react";
import "./Badge.css";

type BadgeTone = "default" | "brand" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export default function Badge({ className = "", tone = "default", ...props }: BadgeProps) {
  return <span className={["ui-badge", `ui-badge--${tone}`, className].filter(Boolean).join(" ")} {...props} />;
}
