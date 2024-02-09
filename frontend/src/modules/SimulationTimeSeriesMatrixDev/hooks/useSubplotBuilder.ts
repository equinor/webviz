import { SummaryVectorObservations_api } from "@api";
import { ColorScale } from "@lib/utils/ColorScale";
import { ColorSet } from "@lib/utils/ColorSet";
import { Size2D } from "@lib/utils/geometry";

import { useAtomValue } from "jotai";
import { Layout } from "plotly.js";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

import {
    activeTimestampUtcMsAtom,
    colorByParameterAtom,
    groupByAtom,
    loadedVectorSpecificationsAndHistoricalDataAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    loadedVectorSpecificationsAndStatisticsDataAtom,
    parameterIdentAtom,
    selectedEnsemblesAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    vectorObservationsQueriesAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "../atoms";
import { GroupBy, VectorSpec, VisualizationMode } from "../state";
import { EnsemblesContinuousParameterColoring } from "../utils/ensemblesContinuousParameterColoring";
import { SubplotBuilder, SubplotOwner } from "../utils/subplotBuilder";
import { TimeSeriesPlotData } from "../utils/timeSeriesPlotData";
import {
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "../utils/vectorSpecificationsAndQueriesUtils";

export function useSubplotBuilder(
    wrapperDivSize: Size2D,
    colorSet: ColorSet,
    parameterColorScale: ColorScale
): [Partial<TimeSeriesPlotData>[], Partial<Layout>] {
    const groupBy = useAtomValue(groupByAtom);
    const visualizationMode = useAtomValue(visualizationModeAtom);
    const showObservations = useAtomValue(showObservationsAtom);
    const parameterIdent = useAtomValue(parameterIdentAtom);
    const vectorSpecifications = useAtomValue(vectorSpecificationsAtom);
    const selectedEnsembles = useAtomValue(selectedEnsemblesAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);
    const statisticsSelection = useAtomValue(statisticsSelectionAtom);
    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const loadedVectorSpecificationsAndStatisticsData = useAtomValue(loadedVectorSpecificationsAndStatisticsDataAtom);
    const loadedVectorSpecificationsAndHistoricalData = useAtomValue(loadedVectorSpecificationsAndHistoricalDataAtom);
    const colorByParameter = useAtomValue(colorByParameterAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc();

    const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;

    const scatterType =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            ? "scattergl"
            : "scatter";

    const ensemblesParameterColoring =
        colorByParameter && parameterIdent
            ? new EnsemblesContinuousParameterColoring(selectedEnsembles, parameterIdent, parameterColorScale)
            : null;

    const loadedVectorSpecificationsAndObservationData: {
        vectorSpecification: VectorSpec;
        data: SummaryVectorObservations_api;
    }[] = [];
    vectorObservationsQueries.ensembleVectorObservationDataMap.forEach((ensembleObservationData) => {
        if (showObservations && !ensembleObservationData.hasSummaryObservations) {
            return;
        }

        loadedVectorSpecificationsAndObservationData.push(...ensembleObservationData.vectorsObservationData);
    });

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
    if (colorByParameter && visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
        subplotBuilder.addRealizationTracesColoredByParameter(loadedVectorSpecificationsAndRealizationData);
    }
    if (!colorByParameter && visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
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

    if (activeTimestampUtcMs) {
        subplotBuilder.addTimeAnnotation(activeTimestampUtcMs);
    }

    const plotData = subplotBuilder.createPlotData();
    const plotLayout = subplotBuilder.createPlotLayout();

    return [plotData, plotLayout];
}
