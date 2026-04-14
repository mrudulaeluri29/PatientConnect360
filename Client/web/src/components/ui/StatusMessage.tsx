import type { HTMLAttributes } from "react";
import "./StatusMessage.css";

type StatusTone = "info" | "success" | "warning" | "danger";

interface StatusMessageProps extends HTMLAttributes<HTMLDivElement> {
  tone?: StatusTone;
}

export default function StatusMessage({ className = "", tone = "info", ...props }: StatusMessageProps) {
  return <div className={["ui-status-message", `ui-status-message--${tone}`, className].filter(Boolean).join(" ")} {...props} />;
}
