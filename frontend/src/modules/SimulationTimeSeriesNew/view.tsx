import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { useHistoricalVectorDataQueries, useStatisticalVectorDataQueries, useVectorDataQueries } from "./queryHooks";
import { GroupBy, State, VisualizationMode } from "./state";
import { EnsembleSubplotBuilder } from "./utils/PlotFigureBuilder/ensembleSubplotBuilder";
import { VectorSubplotBuilder } from "./utils/PlotFigureBuilder/vectorSubplotBuilder";
import {
    createLoadedVectorSpecificationAndDataArray,
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "./utils/plotUtils";

export const view = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
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
    const historicalVectorDataQueries = useHistoricalVectorDataQueries(
        vectorSpecifications?.filter((vec) => vec.hasHistoricalVector) ?? null,
        resampleFrequency,
        vectorSpecifications?.some((vec) => vec.hasHistoricalVector) ?? false
    );

    // Map vector specifications and queries with data
    const loadedVectorSpecificationsAndRealizationData = vectorSpecifications
        ? createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorDataQueries)
        : [];
    const loadedVectorSpecificationsAndStatisticsData = vectorSpecifications
        ? createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorStatisticsQueries)
        : [];
    const loadedVectorSpecificationsAndHistoricalData = vectorSpecifications
        ? createLoadedVectorSpecificationAndDataArray(vectorSpecifications, historicalVectorDataQueries)
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
    const subplotBuilder =
        groupBy === GroupBy.TIME_SERIES
            ? new VectorSubplotBuilder(
                  vectorSpecifications ?? [],
                  colorSet,
                  wrapperDivSize.width,
                  wrapperDivSize.height
              )
            : new EnsembleSubplotBuilder(
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

    // TODO: Keep uirevision?
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot
                data={subplotBuilder.createPlotData()}
                layout={subplotBuilder.createPlotLayout()}
                config={{ scrollZoom: true }}
                onHover={handleHover}
                onUnhover={handleUnHover}
            />
        </div>
    );
};
