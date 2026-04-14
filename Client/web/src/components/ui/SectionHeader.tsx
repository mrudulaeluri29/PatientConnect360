import type { ReactNode } from "react";
import "./SectionHeader.css";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function SectionHeader({ eyebrow, title, description, actions }: SectionHeaderProps) {
  return (
    <div className="ui-section-header">
      <div className="ui-section-header__content">
        {eyebrow ? <div className="ui-section-header__eyebrow">{eyebrow}</div> : null}
        <h2 className="ui-section-header__title">{title}</h2>
        {description ? <p className="ui-section-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="ui-section-header__actions">{actions}</div> : null}
    </div>
  );
}
