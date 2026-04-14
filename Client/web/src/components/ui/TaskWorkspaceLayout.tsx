import type { ReactNode } from "react";
import "./TaskWorkspaceLayout.css";

interface TaskWorkspaceLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  className?: string;
}

export default function TaskWorkspaceLayout({ sidebar, main, className = "" }: TaskWorkspaceLayoutProps) {
  return (
    <div className={["task-workspace", className].filter(Boolean).join(" ")}>
      <aside className="task-workspace__sidebar">{sidebar}</aside>
      <section className="task-workspace__main">{main}</section>
    </div>
  );
}
