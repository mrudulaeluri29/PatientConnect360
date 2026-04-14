import type { HTMLAttributes } from "react";
import "./FilterBar.css";

export default function FilterBar({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["ui-filter-bar", className].filter(Boolean).join(" ")} {...props} />;
}
