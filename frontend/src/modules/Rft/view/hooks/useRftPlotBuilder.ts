import React from "react";

import type { Layout, PlotData } from "plotly.js";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Size2D } from "@lib/utils/geometry";

import type { RftDataAccessorLike, RftEnsembleObservationsData, VisualizationSettings } from "../../typesAndEnums";
import { extractObservationRows, makeValueRange } from "../utils/plotData";
import { RftPlotBuilder } from "../utils/RftPlotBuilder";

export type RftPlotContent = {
    plotData: Partial<PlotData>[];
    layout: Partial<Layout>;
};

type UseRftPlotBuilderParams = {
    dataAccessor: RftDataAccessorLike | null;
    selectedEnsembles: RegularEnsemble[];
    colorSet: ColorSet;
    wellName: string | null;
    responseName: string | null;
    timestampUtcMs: number | null;
    visualizationSettings: VisualizationSettings;
    observationsData: RftEnsembleObservationsData[];
    size: Size2D;
};

/**
 * Builds the Plotly traces and layout for the RFT plot, memoized on its inputs so that unrelated
 * re-renders (e.g. the depth-line overlay dragging) do not trigger expensive trace rebuilds.
 */
export function useRftPlotBuilder(params: UseRftPlotBuilderParams): RftPlotContent | null {
    const {
        dataAccessor,
        selectedEnsembles,
        colorSet,
        wellName,
        responseName,
        timestampUtcMs,
        visualizationSettings,
        observationsData,
        size,
    } = params;

    return React.useMemo(
        function buildPlotContent(): RftPlotContent | null {
            if (!dataAccessor || !wellName || !responseName || timestampUtcMs === null) {
                return null;
            }

            const entries = dataAccessor.getEntries();
            if (entries.length === 0) {
                return null;
            }

            const plotBuilder = new RftPlotBuilder(dataAccessor, selectedEnsembles, colorSet);

            const observationRows = visualizationSettings.showObservations
                ? extractObservationRows(observationsData, wellName, timestampUtcMs, responseName)
                : [];
            const valueRange = makeValueRange(entries, observationRows);

            const shownLegendEnsembles = new Set<string>();
            const plotData = [
                ...plotBuilder.makeLegendTraces(shownLegendEnsembles),
                ...(visualizationSettings.showStatisticalFan
                    ? plotBuilder.makeStatisticFanTraces(shownLegendEnsembles)
                    : []),
                ...(visualizationSettings.showStatisticalLines
                    ? plotBuilder.makeStatisticLineTraces(
                          responseName,
                          visualizationSettings.selectedStatistics,
                          shownLegendEnsembles,
                      )
                    : []),
                ...(visualizationSettings.showIndividualRealizations
                    ? plotBuilder.makeIndividualRealizationTraces(responseName, shownLegendEnsembles)
                    : []),
                ...(visualizationSettings.showObservations
                    ? plotBuilder.makeObservationTraces(observationRows, responseName)
                    : []),
            ];

            const layout = plotBuilder.makeLayout(size, responseName, valueRange);

            return { plotData, layout };
        },
        [
            dataAccessor,
            selectedEnsembles,
            colorSet,
            wellName,
            responseName,
            timestampUtcMs,
            visualizationSettings,
            observationsData,
            size,
        ],
    );
}
