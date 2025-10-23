import type React from "react";
import { useMemo } from "react";

import { ContentWarning } from "@modules/_shared/components/ContentMessage";
import type { PlotItem } from "@modules/_shared/components/VirtualizedPlotlyFigure";
import { VirtualizedPlotlyFigure } from "@modules/_shared/components/VirtualizedPlotlyFigure";

import { ParameterDistributionPlotType } from "../../typesAndEnums";
import type { EnsembleSetParameterArray } from "../utils/ensembleSetParameterArray";
import { generateLayoutForParameter, generateTracesForParameter } from "../utils/plotUtils";
import type { TraceGenerationOptions } from "../utils/plotUtils";

type ParameterDistributionPlotProps = {
    dataArr: EnsembleSetParameterArray[];
    plotType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
    width: number;
    height: number;
};

export function VirtualizedParameterDistributionPlot(props: ParameterDistributionPlotProps): React.ReactElement {
    const FIXED_PLOT_HEIGHT = 350;

    // Convert parameter data to plot items
    const plotItems: PlotItem[] = useMemo(() => {
        return props.dataArr.map((parameterData) => {
            const showRugTraces =
                props.plotType === ParameterDistributionPlotType.DISTRIBUTION_PLOT &&
                props.showIndividualRealizationValues;

            const traceOptions: TraceGenerationOptions = {
                plotType: props.plotType,
                showIndividualRealizationValues: props.showIndividualRealizationValues,
                showPercentilesAndMeanLines: props.showPercentilesAndMeanLines,
            };

            const traces = generateTracesForParameter(parameterData, traceOptions);
            const layout = generateLayoutForParameter({
                title: parameterData.parameterIdent.name,
                xAxisIsLogarithmic: parameterData.isLogarithmic === true,
                showZeroLine: showRugTraces,
            });

            return {
                id: parameterData.parameterIdent.name,
                data: traces,
                layout: layout,
                config: { displayModeBar: false },
                placeholderLabel: parameterData.parameterIdent.name,
            };
        });
    }, [props.dataArr, props.plotType, props.showIndividualRealizationValues, props.showPercentilesAndMeanLines]);

    // If no parameters, show ContentWarning
    if (plotItems.length === 0) {
        return <ContentWarning>No parameters selected. Please check your settings</ContentWarning>;
    }

    return (
        <VirtualizedPlotlyFigure
            plotItems={plotItems}
            width={props.width}
            height={props.height}
            fixedPlotHeight={FIXED_PLOT_HEIGHT}
            emptyContent={<ContentWarning>No parameters selected. Please check your settings</ContentWarning>}
        />
    );
}
