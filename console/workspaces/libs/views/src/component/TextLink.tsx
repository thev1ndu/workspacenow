import type { ReactNode } from "react";
import { Link } from "@heroui/react";

/** In-app navigation as a text link; routing goes through the Shell's RouterProvider. */
export function TextLink({ to, children, onClick }: { to: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Link href={to} onPress={onClick} className="font-medium no-underline hover:underline">
      {children}
    </Link>
  );
}
