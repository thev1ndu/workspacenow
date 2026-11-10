import "@carbon/charts-react/styles.css";

import {
  AreaChart as CarbonAreaChart,
  DonutChart as CarbonDonutChart,
  GaugeChart as CarbonGaugeChart,
  GroupedBarChart as CarbonGroupedBarChart,
  LineChart as CarbonLineChart,
  MeterChart as CarbonMeterChart,
  PieChart as CarbonPieChart,
  SimpleBarChart as CarbonSimpleBarChart,
  StackedAreaChart as CarbonStackedAreaChart,
  StackedBarChart as CarbonStackedBarChart,
} from "@carbon/charts-react";

import { createCarbonChart } from "./CarbonChart";

export const LineChart = createCarbonChart(CarbonLineChart, "LineChart");
export const AreaChart = createCarbonChart(CarbonAreaChart, "AreaChart");
export const StackedAreaChart = createCarbonChart(CarbonStackedAreaChart, "StackedAreaChart");
export const SimpleBarChart = createCarbonChart(CarbonSimpleBarChart, "SimpleBarChart");
export const GroupedBarChart = createCarbonChart(CarbonGroupedBarChart, "GroupedBarChart");
export const StackedBarChart = createCarbonChart(CarbonStackedBarChart, "StackedBarChart");
export const DonutChart = createCarbonChart(CarbonDonutChart, "DonutChart");
export const PieChart = createCarbonChart(CarbonPieChart, "PieChart");
export const GaugeChart = createCarbonChart(CarbonGaugeChart, "GaugeChart");
export const MeterChart = createCarbonChart(CarbonMeterChart, "MeterChart");

export { ChartThemeProvider, useChartTheme, type ChartThemeId } from "./ChartTheme";
export { isEmptySeries } from "./isEmptySeries";
export type { CarbonChartProps } from "./CarbonChart";

// Carbon's own option types and enums, so pages need no direct dependency on @carbon/charts-react.
export type {
  AreaChartOptions,
  BarChartOptions,
  ChartOptions,
  ChartTabularData,
  DonutChartOptions,
  GaugeChartOptions,
  LineChartOptions,
  MeterChartOptions,
  PieChartOptions,
  StackedAreaChartOptions,
  StackedBarChartOptions,
} from "@carbon/charts-react";
export { Alignments, AxisPositions, CartesianOrientations, GaugeTypes, LegendPositions, ScaleTypes, Statuses, TruncationTypes } from "@carbon/charts-react";
