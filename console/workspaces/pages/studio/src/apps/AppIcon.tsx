import type { Application } from "@workspacenow/types";

const SIZE = { xs: "size-5 rounded text-[9px]", sm: "size-7 rounded-md text-[11px]", md: "size-10 rounded-lg text-sm", lg: "size-12 rounded-xl text-base" };

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/** An application's mark: its initials on a quiet tile, the same everywhere it appears. */
export function AppIcon({ app, size = "md" }: { app: Pick<Application, "name">; size?: keyof typeof SIZE }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center bg-default font-semibold tracking-tight text-foreground ring-1 ring-separator ring-inset ${SIZE[size]}`}
    >
      {initials(app.name)}
    </span>
  );
}
