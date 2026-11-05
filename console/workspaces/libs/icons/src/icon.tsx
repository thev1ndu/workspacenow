import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/** What call sites pass to an icon. Size comes from className, falling back to 16px. */
export interface IconProps {
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const DEFAULT_SIZE = 16;
const STROKE_WIDTH = 2;

// The controls an icon usually sits in; hovering or focusing any part of one plays the icon's animation.
const TRIGGER = 'a, button, label, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], [role="row"]';

/** True while the nearest interactive ancestor is hovered or focused, unless the user prefers reduced motion. */
function useTriggerActive() {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const anchor = ref.current;
    if (!anchor || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const target = anchor.closest(TRIGGER) ?? anchor.parentElement;
    if (!target) return;
    const on = () => setActive(true);
    const off = () => setActive(false);
    target.addEventListener("pointerenter", on);
    target.addEventListener("pointerleave", off);
    target.addEventListener("focusin", on);
    target.addEventListener("focusout", off);
    return () => {
      target.removeEventListener("pointerenter", on);
      target.removeEventListener("pointerleave", off);
      target.removeEventListener("focusin", on);
      target.removeEventListener("focusout", off);
    };
  }, []);
  return [ref, active] as const;
}

type AnimatedIconComponent = ComponentType<{ size?: number; animate?: boolean; fill?: string } & IconProps>;

/** An Animate UI icon that plays when its control is hovered or focused. */
export function animated(Icon: AnimatedIconComponent, name: string, defaults: { fill?: string } = {}) {
  function AnimatedIcon(props: IconProps) {
    const [ref, active] = useTriggerActive();
    // display: contents keeps the wrapper out of layout, so the svg sizes and aligns exactly as before.
    return (
      <span ref={ref} style={{ display: "contents" }}>
        <Icon size={DEFAULT_SIZE} {...defaults} {...props} animate={active} />
      </span>
    );
  }
  AnimatedIcon.displayName = name;
  return AnimatedIcon;
}

/** A static Hugeicon, drawn at the animated icons' stroke so the two kinds match. */
export function still(icon: IconSvgElement, name: string) {
  function StillIcon(props: IconProps) {
    return <HugeiconsIcon icon={icon} size={DEFAULT_SIZE} strokeWidth={STROKE_WIDTH} {...props} />;
  }
  StillIcon.displayName = name;
  return StillIcon;
}
