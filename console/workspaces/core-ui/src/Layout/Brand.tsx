/** The WorkspaceNow wordmark, set in Ubuntu. Not selectable: it is a logo, not text to copy. */
export function Brand() {
  return <span className="font-brand text-[17px] font-bold tracking-tight text-foreground select-none">WorkspaceNow</span>;
}

/** The wordmark's initial, for the collapsed sidebar rail. */
export function BrandMark() {
  return (
    <span aria-label="WorkspaceNow" className="font-brand text-xl leading-none font-bold text-foreground select-none">
      W
    </span>
  );
}
