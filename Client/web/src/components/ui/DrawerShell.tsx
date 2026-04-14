import type { ReactNode } from "react";
import "./DrawerShell.css";

interface DrawerShellProps {
  title?: string;
  children: ReactNode;
}

export default function DrawerShell({ title, children }: DrawerShellProps) {
  return (
    <div className="ui-drawer-shell">
      {title ? <div className="ui-drawer-shell__header"><h3>{title}</h3></div> : null}
      <div className="ui-drawer-shell__body">{children}</div>
    </div>
  );
}
