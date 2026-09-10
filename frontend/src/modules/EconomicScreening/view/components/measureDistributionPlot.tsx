import type { BoxPlotData, Layout, PlotData } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import type { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { DistributionPlotType } from "@modules/EconomicScreening/typesAndEnums";
import type { MeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";
import { getMeasureDisplayName } from "@modules/EconomicScreening/utils/measureAccessors";

export type MeasureDistributionPlotProps = {
    measure: EconomicMeasure;
    measureValues: MeasureValues;
    unit: string;
    plotType: DistributionPlotType;
    color: string;
    width: number;
    height: number;
};

export function MeasureDistributionPlot(props: MeasureDistributionPlotProps): React.ReactNode {
    const axisTitle = props.unit
        ? `${getMeasureDisplayName(props.measure)} [${props.unit}]`
        : getMeasureDisplayName(props.measure);

    const data: Partial<PlotData | BoxPlotData>[] =
        props.plotType === DistributionPlotType.BOX
            ? [
                  {
                      x: props.measureValues.values,
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
                      x: props.measureValues.values,
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
        yaxis: { title: { text: props.plotType === DistributionPlotType.BOX ? "" : "Realization count" } },
        showlegend: false,
        bargap: 0.05,
    };

    return <Plot data={data} layout={layout} />;
}
