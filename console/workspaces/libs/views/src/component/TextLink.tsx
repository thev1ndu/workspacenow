import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** In-app navigation as a text link; routing goes through the Shell's RouterProvider. */
export function TextLink({ to, children, onClick }: { to: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="font-medium text-accent no-underline hover:underline">
      {children}
    </Link>
  );
}
