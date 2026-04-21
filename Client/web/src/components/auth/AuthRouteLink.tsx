import type { MouseEvent, ReactNode } from "react";
import { Link, useNavigate, type To } from "react-router";
import { navigateWithViewTransition } from "./authMotion";

type Props = {
  to: To;
  replace?: boolean;
  state?: unknown;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: unknown;
};

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

export default function AuthRouteLink({
  to,
  replace,
  state,
  className,
  children,
  onClick,
  ...rest
}: Props) {
  const navigate = useNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || isModifiedEvent(event) || event.button !== 0) return;

    event.preventDefault();
    navigateWithViewTransition(navigate, to, { replace, state });
  };

  return (
    <Link to={to} state={state} replace={replace} className={className} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
