import React from "react";
import Plot from "react-plotly.js";

import { SummaryVectorObservations_api } from "@api";
import { ChannelContentDefinition } from "@framework/DataChannelTypes";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { isEqual } from "lodash";
import { Annotations, Layout, PlotDatum, PlotMouseEvent, Shape } from "plotly.js";

import { ChannelIds } from "./channelDefs";
import { makeVectorGroupDataGenerator } from "./dataGenerators";
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

export const View = ({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const ensembleSet = useEnsembleSet(workbenchSession);
    const getFilteredEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);
    const statusWriter = useViewStatusWriter(viewContext);

    const [activeTimestampUtcMs, setActiveTimestampUtcMs] = React.useState<number | null>(null);

    // Store values
    const vectorSpecifications = viewContext.useStoreValue("vectorSpecifications");
    const groupBy = viewContext.useStoreValue("groupBy");
    const resampleFrequency = viewContext.useStoreValue("resamplingFrequency");
    const visualizationMode = viewContext.useStoreValue("visualizationMode");
    const showHistorical = viewContext.useStoreValue("showHistorical");
    const showObservations = viewContext.useStoreValue("showObservations");
    const statisticsSelection = viewContext.useStoreValue("statisticsSelection");
    const parameterIdent = viewContext.useStoreValue("parameterIdent");
    const colorRealizationsByParameter = viewContext.useStoreValue("colorRealizationsByParameter");

    // Apply realization filtering
    vectorSpecifications?.forEach((vectorSpecification) => {
        const filteredEnsembleRealizations = getFilteredEnsembleRealizationsFunc(vectorSpecification.ensembleIdent);
        const ensembleRealizations = ensembleSet.findEnsemble(vectorSpecification.ensembleIdent)?.getRealizations();

        // Check if no realizations are filtered out
        const isAllRealizationsSelected = isEqual(filteredEnsembleRealizations, ensembleRealizations);

        vectorSpecification.selectedIndividualRealizations = isAllRealizationsSelected
            ? null
            : [...filteredEnsembleRealizations];
        vectorSpecification.selectedStatisticsRealizations = isAllRealizationsSelected
            ? null
            : [...filteredEnsembleRealizations];
    });

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
    const vectorDataQueries = useVectorDataQueries(vectorSpecifications, resampleFrequency, true);
    const vectorStatisticsQueries = useStatisticalVectorDataQueries(
        vectorSpecifications,
        resampleFrequency,
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

    if (!isQueryFetching && activeTimestampUtcMs === null && loadedVectorSpecificationsAndRealizationData.length > 0) {
        const firstTimeStamp =
            loadedVectorSpecificationsAndRealizationData.at(0)?.data.at(0)?.timestamps_utc_ms[0] ?? null;
        setActiveTimestampUtcMs(firstTimeStamp);
    }

    const contents: ChannelContentDefinition[] = loadedVectorSpecificationsAndRealizationData.map((el) => ({
        contentIdString: `${el.vectorSpecification.vectorName}-::-${el.vectorSpecification.ensembleIdent}`,
        displayName: `${el.vectorSpecification.vectorName} (${makeEnsembleDisplayName(
            el.vectorSpecification.ensembleIdent
        )})`,
        dataGenerator: makeVectorGroupDataGenerator(
            el.vectorSpecification,
            loadedVectorSpecificationsAndRealizationData,
            activeTimestampUtcMs ?? 0,
            makeEnsembleDisplayName
        ),
    }));

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.TIME_SERIES,
        dependencies: [loadedVectorSpecificationsAndRealizationData, activeTimestampUtcMs],
        enabled: !isQueryFetching,
        contents,
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
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles);
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

    function handleClickInChart(e: PlotMouseEvent) {
        const clickedPoint: PlotDatum = e.points[0];
        if (!clickedPoint) {
            return;
        }

        if (clickedPoint.pointIndex >= 0 && clickedPoint.pointIndex < clickedPoint.data.x.length) {
            const timestampUtcMs = clickedPoint.data.x[clickedPoint.pointIndex];
            if (typeof timestampUtcMs === "number") {
                setActiveTimestampUtcMs(timestampUtcMs);
            }
        }
    }

    const doRenderContentError = hasRealizationsQueryError || hasStatisticsQueryError;

    const plotData = subplotBuilder.createPlotData();
    const plotLayout = subplotBuilder.createPlotLayout();

    const timeAnnotation: Partial<Annotations>[] = activeTimestampUtcMs
        ? [
              {
                  xref: "x",
                  yref: "paper",
                  x: activeTimestampUtcMs,
                  y: 0 - 22 / wrapperDivSize.height,
                  text: timestampUtcMsToCompactIsoString(activeTimestampUtcMs),
                  showarrow: false,
                  arrowhead: 0,
                  bgcolor: "rgba(255, 255, 255, 1)",
                  bordercolor: "rgba(255, 0, 0, 1)",
                  borderwidth: 2,
                  borderpad: 4,
              },
          ]
        : [];

    const timeShape: Partial<Shape>[] = activeTimestampUtcMs
        ? [
              {
                  type: "line",
                  xref: "x",
                  yref: "paper",
                  x0: activeTimestampUtcMs,
                  y0: 0,
                  x1: activeTimestampUtcMs,
                  y1: 1,
                  line: {
                      color: "red",
                      width: 3,
                      dash: "dot",
                  },
              },
          ]
        : [];

    const adjustedPlotLayout: Partial<Layout> = {
        ...plotLayout,
        shapes: [...(plotLayout.shapes ?? []), ...timeShape],
        annotations: [...(plotLayout.annotations ?? []), ...timeAnnotation],
    };

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {doRenderContentError ? (
                <ContentError>One or more queries have an error state.</ContentError>
            ) : (
                <Plot
                    key={plotData.length} // Note: Temporary to trigger re-render and remove legends when plotData is empty
                    data={plotData}
                    layout={adjustedPlotLayout}
                    config={{ scrollZoom: true }}
                    onClick={handleClickInChart}
                />
            )}
        </div>
    );
};
