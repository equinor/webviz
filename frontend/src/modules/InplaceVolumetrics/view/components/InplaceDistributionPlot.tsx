import Plot from "react-plotly.js";

import { PlotTypeEnum } from "@modules/InplaceVolumetrics/typesAndEnums";
import { InplaceVolGroupedResultValues } from "@modules/InplaceVolumetrics/utils/inplaceVolDataEnsembleSetAccessor";

import { generateInplaceVolPlotlyTraces, generatePlotlySubplotLayout } from "../utils/plotUtils";

export type InplaceResultValues = {
    groupByName: string;
    colorByName: string;
    groupedValues: InplaceVolGroupedResultValues[];
};
export type InplaceDistributionPlotProps = {
    plotType: PlotTypeEnum;
    resultValues: InplaceResultValues;
    width: number;
    height: number;
};
export function InplaceDistributionPlot(props: InplaceDistributionPlotProps): React.ReactElement {
    const subPlotTitles = props.resultValues.groupedValues.map((group) => group.groupName as string);
    const layout = generatePlotlySubplotLayout(subPlotTitles, props.height, props.width);

    const traces = generateInplaceVolPlotlyTraces(props.resultValues.groupedValues, props.plotType);

    return <Plot data={traces} layout={layout} config={{ displayModeBar: false }} />;
}
