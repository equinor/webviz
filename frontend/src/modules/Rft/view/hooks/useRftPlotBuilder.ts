import React from "react";

import type { Layout, PlotData } from "plotly.js";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { Size2D } from "@lib/utils/geometry";

import type { RftDataAccessorLike, RftEnsembleObservationsData, VisualizationSettings } from "../../typesAndEnums";
import { extractObservationRowsPerEnsemble, makeValueRange } from "../utils/plotData";
import { RftPlotBuilder } from "../utils/RftPlotBuilder";

export type RftPlotContent = {
    plotData: Partial<PlotData>[];
    layout: Partial<Layout>;
};

type UseRftPlotBuilderParams = {
    dataAccessor: RftDataAccessorLike | null;
    selectedEnsembles: RegularEnsemble[];
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
        wellName,
        responseName,
        timestampUtcMs,
        visualizationSettings,
        observationsData,
        size,
    } = params;

    // The expensive trace building (plotData) and the value range only depend on the data and
    // visualization settings, not on the plot size. Computing them in a separate memo from the
    // layout means resizing the plot (which only changes `size`) re-runs the cheap layout memo
    // without rebuilding all traces.
    const plotResult = React.useMemo(
        function buildPlotData(): { plotData: Partial<PlotData>[]; valueRange: [number, number] | null } | null {
            if (!dataAccessor || !wellName || !responseName || timestampUtcMs === null) {
                return null;
            }

            const entries = dataAccessor.getEntries();
            if (entries.length === 0) {
                return null;
            }

            const plotBuilder = new RftPlotBuilder(dataAccessor, selectedEnsembles);

            const observationsPerEnsemble = visualizationSettings.showObservations
                ? extractObservationRowsPerEnsemble(observationsData, wellName, timestampUtcMs, responseName)
                : [];
            const observationRows = observationsPerEnsemble.flatMap(function getEnsembleObservations(ensembleRows) {
                return ensembleRows.observations;
            });
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
                    ? plotBuilder.makeObservationTraces(observationsPerEnsemble, responseName, shownLegendEnsembles)
                    : []),
            ];

            return { plotData, valueRange };
        },
        [
            dataAccessor,
            selectedEnsembles,
            wellName,
            responseName,
            timestampUtcMs,
            visualizationSettings,
            observationsData,
        ],
    );

    const layout = React.useMemo(
        function buildLayout(): Partial<Layout> | null {
            if (!plotResult || !responseName) {
                return null;
            }
            return RftPlotBuilder.makeLayout(size, responseName, plotResult.valueRange);
        },
        [plotResult, responseName, size],
    );

    return React.useMemo(
        function combinePlotContent(): RftPlotContent | null {
            if (!plotResult || !layout) {
                return null;
            }
            return { plotData: plotResult.plotData, layout };
        },
        [plotResult, layout],
    );
}
