import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
// Note: Have for debug render count info
import { isDevMode } from "@lib/utils/devMode";

import { useHistoricalVectorDataQueries, useStatisticalVectorDataQueries, useVectorDataQueries } from "./queryHooks";
import { GroupBy, State, VisualizationMode } from "./state";
import { SubplotBuilder, SubplotOwner } from "./utils/subplotBuilder";
import {
    createLoadedVectorSpecificationAndDataArray,
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "./utils/vectorSpecificationsAndQueriesUtils";

export const view = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
    // Leave this in until we get a feeling for React18/Plotly
    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const colorSet = workbenchSettings.useColorSet();

    // State
    const vectorSpecifications = moduleContext.useStoreValue("vectorSpecifications");
    const groupBy = moduleContext.useStoreValue("groupBy");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const realizationsToInclude = moduleContext.useStoreValue("realizationsToInclude");
    const visualizationMode = moduleContext.useStoreValue("visualizationMode");
    const showHistorical = moduleContext.useStoreValue("showHistorical");
    const statisticsSelection = moduleContext.useStoreValue("statisticsSelection");

    // Queries
    const vectorDataQueries = useVectorDataQueries(
        vectorSpecifications,
        resampleFrequency,
        realizationsToInclude,
        true
    );
    const vectorStatisticsQueries = useStatisticalVectorDataQueries(
        vectorSpecifications,
        resampleFrequency,
        realizationsToInclude,
        visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
            visualizationMode === VisualizationMode.STATISTICAL_LINES ||
            visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
    );

    const vectorSpecificationsWithHistoricalData = vectorSpecifications?.filter((vec) => vec.hasHistoricalVector);
    const historicalVectorDataQueries = useHistoricalVectorDataQueries(
        vectorSpecificationsWithHistoricalData ?? null,
        resampleFrequency,
        vectorSpecificationsWithHistoricalData?.some((vec) => vec.hasHistoricalVector) ?? false
    );

    // Map vector specifications and queries with data
    const loadedVectorSpecificationsAndRealizationData = vectorSpecifications
        ? createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorDataQueries)
        : [];
    const loadedVectorSpecificationsAndStatisticsData = vectorSpecifications
        ? createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorStatisticsQueries)
        : [];
    const loadedVectorSpecificationsAndHistoricalData = vectorSpecificationsWithHistoricalData
        ? createLoadedVectorSpecificationAndDataArray(
              vectorSpecificationsWithHistoricalData,
              historicalVectorDataQueries
          )
        : [];

    // TODO:
    // - Add loading state if 1 or more queries are loading?
    // - Can check for equal length of useQueries arrays and the loadedVectorSpecificationsAndData arrays?

    // Iterate over unique ensemble names and assign color from color palette
    if (vectorSpecifications) {
        const uniqueEnsembleNames: string[] = [];
        vectorSpecifications.forEach((vectorSpec) => {
            const ensembleName = vectorSpec.ensembleIdent.getEnsembleName();
            if (!uniqueEnsembleNames.includes(ensembleName)) {
                uniqueEnsembleNames.push(vectorSpec.ensembleIdent.getEnsembleName());
            }
        });
    }

    // Plot builder
    // NOTE: useRef?
    const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;
    const subplotBuilder = new SubplotBuilder(
        subplotOwner,
        vectorSpecifications ?? [],
        colorSet,
        wrapperDivSize.width,
        wrapperDivSize.height
    );

    if (visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
        const useIncreasedBrightness = false;
        subplotBuilder.addRealizationsTraces(loadedVectorSpecificationsAndRealizationData, useIncreasedBrightness);
    }
    if (visualizationMode === VisualizationMode.STATISTICAL_FANCHART) {
        const selectedVectorsFanchartStatisticData = filterVectorSpecificationAndFanchartStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.FanchartStatisticsSelection
        );
        subplotBuilder.addFanchartTraces(selectedVectorsFanchartStatisticData);
    }
    if (visualizationMode === VisualizationMode.STATISTICAL_LINES) {
        const highlightStatistics = false;
        const selectedVectorsIndividualStatisticData = filterVectorSpecificationAndIndividualStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.IndividualStatisticsSelection
        );
        subplotBuilder.addStatisticsTraces(selectedVectorsIndividualStatisticData, highlightStatistics);
    }
    if (visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS) {
        const useIncreasedBrightness = true;
        const highlightStatistics = true;
        const selectedVectorsIndividualStatisticData = filterVectorSpecificationAndIndividualStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.IndividualStatisticsSelection
        );
        subplotBuilder.addRealizationsTraces(loadedVectorSpecificationsAndRealizationData, useIncreasedBrightness);
        subplotBuilder.addStatisticsTraces(selectedVectorsIndividualStatisticData, highlightStatistics);
    }
    if (showHistorical) {
        subplotBuilder.addHistoryTraces(loadedVectorSpecificationsAndHistoricalData);
    }

    // Handler methods
    function handleHover() {
        return;
    }

    function handleUnHover() {
        return;
    }

    const plotData = subplotBuilder.createPlotData();
    // TODO: Keep uirevision?
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot
                key={plotData.length} // Note: To trigger re-render and remove legends when plotData is empty
                data={plotData}
                layout={subplotBuilder.createPlotLayout()}
                config={{ scrollZoom: true }}
                onHover={handleHover}
                onUnhover={handleUnHover}
            />
            {isDevMode() && (
                <>
                    <div className="absolute top-10 left-5 italic text-pink-400">(rc={renderCount.current})</div>
                    <div className="absolute top-10 left-20 italic text-pink-400"> Traces: {plotData.length}</div>
                </>
            )}
        </div>
    );
};
