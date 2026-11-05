import type { Annotations, Layout, PlotData, Shape } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import type { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { DistributionPlotType } from "@modules/EconomicScreening/typesAndEnums";
import {
    computeDistributionSummary,
    computeEmpiricalExceedance,
} from "@modules/EconomicScreening/utils/distributionAggregation";
import type { MeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";
import {
    formatMeasureValue,
    getMeasureDisplayName,
    getMeasureDisplayScale,
} from "@modules/EconomicScreening/utils/measureAccessors";
import { placeStatisticLabels } from "@modules/EconomicScreening/utils/statisticLabels";

export type MeasureDistributionPlotProps = {
    measure: EconomicMeasure;
    measureValues: MeasureValues;
    unit: string;
    plotType: DistributionPlotType;
    color: string;
    width: number;
    height: number;
    targetValue?: number | null;
    isDelta: boolean;
};

const MARGIN = { l: 60, r: 20, t: 20, b: 50 };
const LABEL_ROW_HEIGHT_PX = 16;
const STATISTIC_LINE_COLOR = "#374151";
const TARGET_LINE_COLOR = "#6b7280";

type StatisticLine = { name: string; value: number; dash: "solid" | "dash" | "dot"; color: string };

export function MeasureDistributionPlot(props: MeasureDistributionPlotProps): React.ReactNode {
    const values = props.measureValues.values;
    const summary = computeDistributionSummary(values);
    const hasTarget = props.targetValue !== null && props.targetValue !== undefined;
    const lines: StatisticLine[] = [
        ...(summary
            ? [
                  { name: "P90", value: summary.p90, dash: "solid" as const, color: STATISTIC_LINE_COLOR },
                  { name: "P50", value: summary.median, dash: "solid" as const, color: STATISTIC_LINE_COLOR },
                  { name: "P10", value: summary.p10, dash: "solid" as const, color: STATISTIC_LINE_COLOR },
                  { name: "Mean", value: summary.mean, dash: "dash" as const, color: STATISTIC_LINE_COLOR },
              ]
            : []),
        ...(hasTarget
            ? [{ name: "Oil price", value: props.targetValue!, dash: "dot" as const, color: TARGET_LINE_COLOR }]
            : []),
    ];

    // The statistics share the axis scale, so labels and ticks read on the same prefix and decimals.
    const displayScale = getMeasureDisplayScale(
        props.measure,
        [...values, ...lines.map((line) => line.value)],
        props.unit,
    );
    const scaledValues = values.map((value) => value / displayScale.factor);
    const axisTitle = displayScale.unit
        ? `${getMeasureDisplayName(props.measure, props.isDelta)} [${displayScale.unit}]`
        : getMeasureDisplayName(props.measure, props.isDelta);
    const valueFormat = `.${displayScale.numDecimalPlaces}f`;

    const scaledLineValues = lines.map((line) => line.value / displayScale.factor);
    const xMin = Math.min(...scaledValues, ...scaledLineValues);
    const xMax = Math.max(...scaledValues, ...scaledLineValues);
    const plotAreaWidthPx = Math.max(1, props.width - MARGIN.l - MARGIN.r);
    const pxPerUnit = xMax > xMin ? plotAreaWidthPx / (xMax - xMin) : Number.POSITIVE_INFINITY;
    const placedLabels = placeStatisticLabels(
        lines.map((line) => ({
            x: line.value / displayScale.factor,
            text: `${line.name} ${formatMeasureValue(line.value, displayScale)}`,
        })),
        pxPerUnit,
    );
    const numLabelRows = placedLabels.reduce((rows, label) => Math.max(rows, label.row + 1), 0);

    const exceedancePoints = computeEmpiricalExceedance(scaledValues);
    const data: Partial<PlotData>[] =
        props.plotType === DistributionPlotType.EXCEEDANCE
            ? [
                  {
                      x: exceedancePoints.map((point) => point.value),
                      y: exceedancePoints.map((point) => point.percentAbove),
                      customdata: exceedancePoints.map((point) => point.countAbove),
                      type: "scatter",
                      mode: "lines+markers",
                      line: { color: props.color, shape: "hv" },
                      marker: { color: props.color, size: 6 },
                      hovertemplate: `Value: %{x:${valueFormat}}<br>Realizations above: %{customdata}<br>Above: %{y:.1f}%<extra></extra>`,
                  } as Partial<PlotData>,
              ]
            : [
                  {
                      x: scaledValues,
                      type: "histogram",
                      marker: { color: props.color, line: { color: "white", width: 1 } },
                      name: "",
                  } as Partial<PlotData>,
              ];

    const shapes: Partial<Shape>[] = lines.map((line, index) => ({
        type: "line",
        x0: scaledLineValues[index],
        x1: scaledLineValues[index],
        y0: 0,
        y1: 1,
        yref: "paper",
        line: { color: line.color, width: 1, dash: line.dash },
    }));
    const annotations: Partial<Annotations>[] = placedLabels.map((label) => ({
        x: label.x,
        y: 1,
        xref: "x",
        yref: "paper",
        yanchor: "bottom",
        yshift: label.row * LABEL_ROW_HEIGHT_PX,
        text: label.text,
        showarrow: false,
        font: { size: 11, color: STATISTIC_LINE_COLOR },
    }));

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        margin: { ...MARGIN, t: MARGIN.t + numLabelRows * LABEL_ROW_HEIGHT_PX },
        xaxis: { title: { text: axisTitle }, exponentformat: "none", hoverformat: valueFormat },
        yaxis: {
            title: {
                text:
                    props.plotType === DistributionPlotType.EXCEEDANCE
                        ? "Realizations above value (%)"
                        : "Realization count",
            },
            ...(props.plotType === DistributionPlotType.EXCEEDANCE && { range: [0, 100] }),
        },
        shapes,
        annotations,
        showlegend: false,
        bargap: 0.05,
    };

    return <Plot data={data} layout={layout} />;
}
