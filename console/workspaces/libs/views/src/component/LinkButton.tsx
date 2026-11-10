import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger";

const KIND: Record<Variant, string> = {
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary",
  outline: "tertiary",
  ghost: "ghost",
  danger: "danger",
};

/** Navigation that looks like a button: a router link carrying Carbon's button classes. */
export function LinkButton({
  href,
  children,
  variant = "secondary",
  size = "md",
  isIconOnly,
  renderIcon: Icon,
  className,
  "aria-label": ariaLabel,
}: {
  href: string;
  children?: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  isIconOnly?: boolean;
  /** A Carbon icon placed after the label, as Button's renderIcon does. */
  renderIcon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
  "aria-label"?: string;
}) {
  const classes = ["cds--btn", `cds--btn--${KIND[variant]}`, `cds--btn--${size}`, isIconOnly ? "cds--btn--icon-only" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <Link to={href} aria-label={ariaLabel} className={classes}>
      {children}
      {Icon && <Icon className="cds--btn__icon" aria-hidden />}
    </Link>
  );
}
