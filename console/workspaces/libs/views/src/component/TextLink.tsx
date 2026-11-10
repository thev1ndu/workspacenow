import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link } from "@carbon/react";

/** In-app navigation as a Carbon link; routing goes through the Shell's RouterProvider. */
export function TextLink({ to, children, onClick }: { to: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Link as={RouterLink} to={to} onClick={onClick}>
      {children}
    </Link>
  );
}
