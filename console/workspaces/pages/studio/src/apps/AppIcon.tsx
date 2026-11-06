import type { Application } from "@workspacenow/types";

const SIZE = { xs: "size-5 rounded p-0.5", sm: "size-7 rounded-md p-1", md: "size-10 rounded-lg p-1.5", lg: "size-12 rounded-xl p-2" };

/** An application's mark: an identicon generated from its name, the same everywhere it appears. */
export function AppIcon({ app, size = "md" }: { app: Pick<Application, "name">; size?: keyof typeof SIZE }) {
  return (
    <img
      alt=""
      aria-hidden
      loading="lazy"
      src={`https://api.dicebear.com/10.x/identicon/svg?seed=${encodeURIComponent(app.name)}`}
      className={`shrink-0 bg-default ring-1 ring-separator ring-inset ${SIZE[size]}`}
    />
  );
}
