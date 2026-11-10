import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "tertiary" | "outline" | "ghost";

const KIND: Record<Variant, string> = {
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary",
  outline: "secondary",
  ghost: "ghost",
};

/** Navigation that looks like a button: a router link carrying Carbon's button classes. */
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
    <Link
      to={href}
      aria-label={ariaLabel}
      className={`cds--btn cds--btn--${KIND[variant]} cds--btn--${size}${isIconOnly ? " cds--btn--icon-only" : ""} no-underline ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
