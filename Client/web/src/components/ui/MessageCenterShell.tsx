import type { ReactNode } from "react";
import "./MessageCenterShell.css";

interface MessageCenterShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  tabs?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function MessageCenterShell({ title, description, action, tabs, filters, children, className = "" }: MessageCenterShellProps) {
  return (
    <section className={["message-center-shell", className].filter(Boolean).join(" ")}>
      <div className="message-center-shell__header">
        <div className="message-center-shell__header-copy">
          <h2 className="message-center-shell__title">{title}</h2>
          {description ? <p className="message-center-shell__description">{description}</p> : null}
        </div>
        {action ? <div className="message-center-shell__action">{action}</div> : null}
      </div>
      {tabs ? <div className="message-center-shell__tabs">{tabs}</div> : null}
      {filters ? <div className="message-center-shell__filters">{filters}</div> : null}
      <div className="message-center-shell__content">{children}</div>
    </section>
  );
}
