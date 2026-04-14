import type { HTMLAttributes, ReactNode } from "react";
import "./Card.css";

type CardVariant = "default" | "muted" | "raised" | "selectable";
type CardPadding = "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  children: ReactNode;
}

export default function Card({ className = "", variant = "default", padding = "md", children, ...props }: CardProps) {
  const classes = ["ui-card", `ui-card--${variant}`, `ui-card--${padding}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
