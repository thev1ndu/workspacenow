export function JsonView({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-xl bg-surface-secondary p-4 font-mono text-xs leading-relaxed text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
