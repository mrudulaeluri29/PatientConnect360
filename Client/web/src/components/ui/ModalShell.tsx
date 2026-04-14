import type { ReactNode } from "react";
import "./ModalShell.css";

interface ModalShellProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function ModalShell({ title, children, footer }: ModalShellProps) {
  return (
    <div className="ui-modal-shell">
      {title ? <div className="ui-modal-shell__header"><h3>{title}</h3></div> : null}
      <div className="ui-modal-shell__body">{children}</div>
      {footer ? <div className="ui-modal-shell__footer">{footer}</div> : null}
    </div>
  );
}
