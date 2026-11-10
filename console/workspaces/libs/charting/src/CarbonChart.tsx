import { useMemo, useRef, type ComponentType } from "react";
import type { ChartTabularData } from "@carbon/charts-react";

import { useChartTheme } from "./ChartTheme";

/** The base options every Carbon chart accepts, which the wrappers fill in. */
interface SharedOptions {
  title?: string;
  height?: string;
  theme?: string;
  toolbar?: { enabled?: boolean };
  accessibility?: { svgAriaLabel?: string };
  data?: { loading?: boolean };
}

export interface CarbonChartProps<O> {
  data: ChartTabularData;
  /** Carbon's own options for this chart type; theme, height, toolbar and accessibility get defaults. */
  options?: O;
  /** Shown as the chart title and used as its accessible name. */
  title?: string;
  /** Carbon's loading skeleton, for while the data is on its way. */
  loading?: boolean;
}

// Functions serialise as their source so inline formatters do not look like a change on every render.
function fingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === "function" ? v.toString() : v));
}

// Keeps the previous reference while the content is equal, since Carbon charts re-render on any new object.
function useStable<T>(value: T): T {
  const ref = useRef({ key: fingerprint(value), value });
  const key = fingerprint(value);
  if (ref.current.key !== key) ref.current = { key, value };
  return ref.current.value;
}

/** Wraps a Carbon chart so it follows the Carbon theme and starts from the console's defaults. */
export function createCarbonChart<O extends SharedOptions>(Chart: ComponentType<{ data: ChartTabularData; options: O }>, name: string) {
  function CarbonChart({ data, options, title, loading }: CarbonChartProps<O>) {
    const theme = useChartTheme();
    const stableData = useStable(data);
    const stableOptions = useStable(options);
    const merged = useMemo(() => {
      const given: SharedOptions = stableOptions ?? {};
      const resolvedTitle = given.title ?? title;
      return {
        ...given,
        title: resolvedTitle,
        theme: given.theme ?? theme,
        height: given.height ?? "16rem",
        toolbar: { enabled: false, ...given.toolbar },
        accessibility: { svgAriaLabel: resolvedTitle ?? "Chart", ...given.accessibility },
        data: { ...given.data, ...(loading === undefined ? {} : { loading }) },
      } as O;
    }, [stableOptions, title, theme, loading]);
    return <Chart data={stableData} options={merged} />;
  }
  CarbonChart.displayName = name;
  return CarbonChart;
}
