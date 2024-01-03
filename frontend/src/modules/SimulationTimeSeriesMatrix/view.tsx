import React from "react";
import Plot from "react-plotly.js";

import { SummaryVectorObservations_api } from "@api";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import {
    useHistoricalVectorDataQueries,
    useStatisticalVectorDataQueries,
    useVectorDataQueries,
    useVectorObservationsQueries,
} from "./queryHooks";
import { GroupBy, State, VectorSpec, VisualizationMode } from "./state";
import { EnsemblesContinuousParameterColoring } from "./utils/ensemblesContinuousParameterColoring";
import { SubplotBuilder, SubplotOwner } from "./utils/subplotBuilder";
import {
    createLoadedVectorSpecificationAndDataArray,
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "./utils/vectorSpecificationsAndQueriesUtils";

export const View = ({ moduleContext, workbenchSession, workbenchSettings }: ModuleFCProps<State>) => {
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
    const showObservations = moduleContext.useStoreValue("showObservations");
    const statisticsSelection = moduleContext.useStoreValue("statisticsSelection");
    const parameterIdent = moduleContext.useStoreValue("parameterIdent");
    const colorRealizationsByParameter = moduleContext.useStoreValue("colorRealizationsByParameter");

    // Color palettes
    const colorSet = workbenchSettings.useColorSet();
    const parameterColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Diverging,
    });

    // Get selected ensembles from vector specifications
    const selectedEnsembles: Ensemble[] = [];
    vectorSpecifications?.forEach((vectorSpecification) => {
        if (selectedEnsembles.some((ensemble) => ensemble.getIdent().equals(vectorSpecification.ensembleIdent))) {
            return;
        }

        const ensemble = ensembleSet.findEnsemble(vectorSpecification.ensembleIdent);
        if (!ensemble) return;

        selectedEnsembles.push(ensemble);
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
    const vectorObservationsQueries = useVectorObservationsQueries(vectorSpecifications, showObservations);

    // Get fetching status from queries
    const isQueryFetching =
        vectorDataQueries.some((query) => query.isFetching) ||
        vectorStatisticsQueries.some((query) => query.isFetching) ||
        historicalVectorDataQueries.some((query) => query.isFetching) ||
        vectorObservationsQueries.isFetching;

    statusWriter.setLoading(isQueryFetching);

    // Get error/warning status from queries
    const hasRealizationsQueryError = vectorDataQueries.some((query) => query.isError);
    const hasStatisticsQueryError = vectorStatisticsQueries.some((query) => query.isError);
    const hasHistoricalVectorQueryError = historicalVectorDataQueries.some((query) => query.isError);
    if (hasRealizationsQueryError) {
        statusWriter.addError("One or more realization data queries have an error state.");
    }
    if (hasStatisticsQueryError) {
        statusWriter.addError("One or more statistics data queries have an error state.");
    }
    if (hasHistoricalVectorQueryError) {
        statusWriter.addWarning("One or more historical data queries have an error state.");
    }
    if (vectorObservationsQueries.isError) {
        statusWriter.addWarning("One or more vector observation queries have an error state.");
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

    const loadedVectorSpecificationsAndObservationData: {
        vectorSpecification: VectorSpec;
        data: SummaryVectorObservations_api;
    }[] = [];
    vectorObservationsQueries.ensembleVectorObservationDataMap.forEach((ensembleObservationData, ensembleIdent) => {
        if (showObservations && !ensembleObservationData.hasSummaryObservations) {
            const ensembleName = ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString();
            statusWriter.addWarning(`${ensembleName} has no observations.`);
            return;
        }

        loadedVectorSpecificationsAndObservationData.push(...ensembleObservationData.vectorsObservationData);
    });

    // Create parameter color scale helper
    const doColorByParameter =
        colorRealizationsByParameter &&
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS &&
        parameterIdent !== null &&
        selectedEnsembles.some((ensemble) => ensemble.getParameters().hasParameter(parameterIdent));
    const ensemblesParameterColoring = doColorByParameter
        ? new EnsemblesContinuousParameterColoring(selectedEnsembles, parameterIdent, parameterColorScale)
        : null;

    // Set warning for ensembles without selected parameter when coloring is enabled
    if (doColorByParameter && ensemblesParameterColoring) {
        const ensemblesWithoutParameter = selectedEnsembles.filter(
            (ensemble) => !ensemblesParameterColoring.hasParameterForEnsemble(ensemble.getIdent())
        );
        for (const ensemble of ensemblesWithoutParameter) {
            statusWriter.addWarning(
                `Ensemble ${ensemble.getDisplayName()} does not have parameter ${ensemblesParameterColoring.getParameterDisplayName()}`
            );
        }
    }

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
    if (showObservations) {
        subplotBuilder.addObservationsTraces(loadedVectorSpecificationsAndObservationData);
    }

    const doRenderContentError = hasRealizationsQueryError || hasStatisticsQueryError;
    const plotData = subplotBuilder.createPlotData();
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {doRenderContentError ? (
                <ContentError>One or more queries have an error state.</ContentError>
            ) : (
                <Plot
                    key={plotData.length} // Note: Temporary to trigger re-render and remove legends when plotData is empty
                    data={plotData}
                    layout={subplotBuilder.createPlotLayout()}
                    config={{ scrollZoom: true }}
                />
            )}
        </div>
    );
};
