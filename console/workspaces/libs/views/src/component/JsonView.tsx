import { CodeSnippet } from "@carbon/react";

/** A value as pretty-printed JSON in Carbon's multi-line code snippet, with copy and show more. */
export function JsonView({ value }: { value: unknown }) {
  return (
    <CodeSnippet type="multi" feedback="Copied" wrapText maxCollapsedNumberOfRows={12} maxExpandedNumberOfRows={0} showMoreText="Show more" showLessText="Show less">
      {JSON.stringify(value, null, 2)}
    </CodeSnippet>
  );
}
