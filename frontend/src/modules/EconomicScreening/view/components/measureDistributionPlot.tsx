import type { BoxPlotData, Layout, PlotData } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import type { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { DistributionPlotType } from "@modules/EconomicScreening/typesAndEnums";
import { computeEmpiricalExceedance } from "@modules/EconomicScreening/utils/distributionAggregation";
import type { MeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";
import { getMeasureDisplayName, getMeasureDisplayScale } from "@modules/EconomicScreening/utils/measureAccessors";

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

export function MeasureDistributionPlot(props: MeasureDistributionPlotProps): React.ReactNode {
    const displayScale = getMeasureDisplayScale(props.measure, props.measureValues.values, props.unit);
    const scaledValues = props.measureValues.values.map((value) => value / displayScale.factor);
    const axisTitle = displayScale.unit
        ? `${getMeasureDisplayName(props.measure, props.isDelta)} [${displayScale.unit}]`
        : getMeasureDisplayName(props.measure, props.isDelta);

    const exceedancePoints = computeEmpiricalExceedance(scaledValues);
    const data: Partial<PlotData | BoxPlotData>[] =
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
                    hovertemplate: "Value: %{x}<br>Realizations above: %{customdata}<br>Above: %{y:.1f}%<extra></extra>",
                } as Partial<PlotData>,
            ]
            : props.plotType === DistributionPlotType.BOX
                ? [
                    {
                        x: scaledValues,
                        type: "box",
                        name: "",
                        boxpoints: "all",
                        jitter: 0.5,
                        marker: { color: props.color, size: 4 },
                        hovertext: props.measureValues.realizations.map((realization) => `Realization ${realization}`),
                    } as Partial<BoxPlotData>,
                ]
                : [
                    {
                        x: scaledValues,
                        type: "histogram",
                        marker: { color: props.color, line: { color: "white", width: 1 } },
                        name: "",
                    } as Partial<PlotData>,
                ];

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        margin: { l: 60, r: 20, t: 20, b: 50 },
        xaxis: { title: { text: axisTitle } },
        yaxis: {
            title: {
                text:
                    props.plotType === DistributionPlotType.EXCEEDANCE
                        ? "Realizations above value (%)"
                        : props.plotType === DistributionPlotType.BOX
                            ? ""
                            : "Realization count",
            },
            ...(props.plotType === DistributionPlotType.EXCEEDANCE && { range: [0, 100] }),
        },
        shapes:
            props.targetValue === null || props.targetValue === undefined
                ? []
                : [
                    {
                        type: "line",
                        x0: props.targetValue / displayScale.factor,
                        x1: props.targetValue / displayScale.factor,
                        y0: 0,
                        y1: 1,
                        yref: "paper",
                        line: { color: "#6b7280", width: 1, dash: "dot" },
                    },
                ],
        showlegend: false,
        bargap: 0.05,
    };

    return <Plot data={data} layout={layout} />;
}
