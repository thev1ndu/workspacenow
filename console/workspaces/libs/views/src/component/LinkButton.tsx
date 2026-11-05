import type { ReactNode } from "react";
import { Link, buttonVariants } from "@heroui/react";

type Variant = "primary" | "secondary" | "tertiary" | "outline" | "ghost";

/** Navigation that looks like a button: a HeroUI Link styled with HeroUI's button variants. */
export function LinkButton({
  href,
  children,
  variant = "secondary",
  size = "md",
  isIconOnly,
  className,
  "aria-label": ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  isIconOnly?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Link href={href} aria-label={ariaLabel} className={`${buttonVariants({ variant, size, isIconOnly })} gap-2 no-underline ${className ?? ""}`}>
      {children}
    </Link>
  );
}
