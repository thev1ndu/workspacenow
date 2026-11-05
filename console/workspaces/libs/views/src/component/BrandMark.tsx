const SIZE = { sm: "size-5 rounded-md [&_svg]:size-3", md: "size-7 rounded-lg [&_svg]:size-4" };

/** The WorkspaceNow mark: a plain glyph on the foreground colour, no gradients. */
export function BrandMark({ size = "md" }: { size?: keyof typeof SIZE }) {
  return (
    <span className={`flex shrink-0 items-center justify-center bg-foreground text-background ${SIZE[size]}`} aria-label="WorkspaceNow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 7l3.4 10L12 9.5 16.6 17 20 7" />
      </svg>
    </span>
  );
}
