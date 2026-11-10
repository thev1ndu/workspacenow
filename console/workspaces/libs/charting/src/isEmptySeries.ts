/** True when a chart has nothing to draw: no points, or every numeric value is zero or missing. */
export function isEmptySeries(data: ReadonlyArray<Record<string, unknown>> | undefined | null): boolean {
  if (!data || data.length === 0) return true;
  return data.every((row) => {
    const value = row.value;
    return value === undefined || value === null || Number(value) === 0;
  });
}
