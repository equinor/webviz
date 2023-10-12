import React from "react";
import Plot from "react-plotly.js";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError } from "@modules/_shared/components/MessageContent/messageContent";

import { useHistoricalVectorDataQueries, useStatisticalVectorDataQueries, useVectorDataQueries } from "./queryHooks";
import { GroupBy, State, VisualizationMode } from "./state";
import { EnsemblesContinuousParameterColoring } from "./utils/ensemblesContinuousParameterColoring";
import { SubplotBuilder, SubplotOwner } from "./utils/subplotBuilder";
import {
    createLoadedVectorSpecificationAndDataArray,
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "./utils/vectorSpecificationsAndQueriesUtils";

export const view = ({ moduleContext, workbenchSession, workbenchSettings }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const ensembleSet = useEnsembleSet(workbenchSession);

    const statusWriter = useViewStatusWriter(moduleContext);

    // Store values
    const vectorSpecifications = moduleContext.useStoreValue("vectorSpecifications");
    const groupBy = moduleContext.useStoreValue("groupBy");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const realizationsToInclude = moduleContext.useStoreValue("realizationsToInclude");
    const visualizationMode = moduleContext.useStoreValue("visualizationMode");
    const showHistorical = moduleContext.useStoreValue("showHistorical");
    const statisticsSelection = moduleContext.useStoreValue("statisticsSelection");
    const parameterIdent = moduleContext.useStoreValue("parameterIdent");
    const colorRealizationsByParameter = moduleContext.useStoreValue("colorRealizationsByParameter");

    // Color palettes
    const colorSet = workbenchSettings.useColorSet();
    const parameterColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Diverging,
    });

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

    const isQueryFetching = [
        ...vectorDataQueries.filter((query) => query.isFetching),
        ...vectorStatisticsQueries.filter((query) => query.isFetching),
        ...historicalVectorDataQueries.filter((query) => query.isFetching),
    ];

    statusWriter.setLoading(isQueryFetching.length > 0);

    statusWriter.setDebugMessage("bla");

    const hasQueryError = [
        ...vectorDataQueries.filter((query) => query.isError),
        ...vectorStatisticsQueries.filter((query) => query.isError),
        ...historicalVectorDataQueries.filter((query) => query.isError),
    ];
    if (hasQueryError.length > 0) {
        statusWriter.addError("One or more queries have an error state.");
        return <ContentError>One or more queries have an error state.</ContentError>;
    }

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

    // Retrieve selected ensembles from vector specifications
    const selectedEnsembles: Ensemble[] = [];
    vectorSpecifications?.forEach((vectorSpecification) => {
        if (selectedEnsembles.some((ensemble) => ensemble.getIdent().equals(vectorSpecification.ensembleIdent))) {
            return;
        }

        const ensemble = ensembleSet.findEnsemble(vectorSpecification.ensembleIdent);
        if (!ensemble) return;

        selectedEnsembles.push(ensemble);
    });

    // Create parameter color scale helper
    const doColorByParameter =
        colorRealizationsByParameter &&
        parameterIdent !== null &&
        selectedEnsembles.some((ensemble) => ensemble.getParameters().hasParameter(parameterIdent));
    const ensemblesParameterColoring = doColorByParameter
        ? new EnsemblesContinuousParameterColoring(selectedEnsembles, parameterIdent, parameterColorScale)
        : null;

    // Callback function for ensemble display name
    function makeEnsembleDisplayName(ensembleIdent: EnsembleIdent): string {
        const ensembleNameCount = selectedEnsembles.filter(
            (ensemble) => ensemble.getEnsembleName() === ensembleIdent.getEnsembleName()
        ).length;
        if (ensembleNameCount === 1) {
            return ensembleIdent.getEnsembleName();
        }

        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) {
            return ensembleIdent.getEnsembleName();
        }

        return ensemble.getDisplayName();
    }

    // Create Plot Builder
    const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;
    const scatterType =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            ? "scattergl"
            : "scatter";

    const subplotBuilder = new SubplotBuilder(
        subplotOwner,
        vectorSpecifications ?? [],
        makeEnsembleDisplayName,
        colorSet,
        wrapperDivSize.width,
        wrapperDivSize.height,
        ensemblesParameterColoring ?? undefined,
        scatterType
    );

    // Add traces based on visualization mode
    if (doColorByParameter && visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
        subplotBuilder.addRealizationTracesColoredByParameter(loadedVectorSpecificationsAndRealizationData);
    }
    if (!doColorByParameter && visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
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

    // TODO: Keep uirevision?
    const plotData = subplotBuilder.createPlotData();
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot
                key={plotData.length} // Note: To trigger re-render and remove legends when plotData is empty
                data={plotData}
                layout={subplotBuilder.createPlotLayout()}
                config={{ scrollZoom: true }}
            />
        </div>
    );
};
