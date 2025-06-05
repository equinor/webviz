import { useAtomValue } from "jotai";

import type { SummaryVectorObservations_api } from "@api";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Size2D } from "@lib/utils/geometry";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";

import type { VectorSpec } from "../../typesAndEnums";
import { GroupBy, VisualizationMode } from "../../typesAndEnums";
import { resampleFrequencyAtom, showObservationsAtom, visualizationModeAtom } from "../atoms/baseAtoms";
import {
    activeTimestampUtcMsAtom,
    loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    loadedVectorSpecificationsAndStatisticsDataAtom,
} from "../atoms/derivedAtoms";
import { vectorObservationsQueriesAtom } from "../atoms/queryAtoms";
import type { EnsemblesContinuousParameterColoring } from "../utils/ensemblesContinuousParameterColoring";
import { PlotBuilder, SubplotOwner } from "../utils/PlotBuilder";
import {
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "../utils/vectorSpecificationsAndQueriesUtils";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

export function usePlotBuilder(
    viewContext: ViewContext<Interfaces>,
    wrapperDivSize: Size2D,
    colorSet: ColorSet,
    ensemblesParameterColoring: EnsemblesContinuousParameterColoring | null,
): PlotBuilder {
    const groupBy = viewContext.useSettingsToViewInterfaceValue("groupBy");
    const showObservations = useAtomValue(showObservationsAtom);
    const visualizationMode = useAtomValue(visualizationModeAtom);

    const vectorSpecifications = viewContext.useSettingsToViewInterfaceValue("vectorSpecifications");
    const showHistorical = viewContext.useSettingsToViewInterfaceValue("showHistorical");
    const statisticsSelection = viewContext.useSettingsToViewInterfaceValue("statisticsSelection");
    const subplotLimitation = viewContext.useSettingsToViewInterfaceValue("subplotLimitation");

    const resampleFrequency = useAtomValue(resampleFrequencyAtom);
    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);

    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const loadedVectorSpecificationsAndStatisticsData = useAtomValue(loadedVectorSpecificationsAndStatisticsDataAtom);
    const loadedRegularEnsembleVectorSpecificationsAndHistoricalData = useAtomValue(
        loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom,
    );
    const colorByParameter = viewContext.useSettingsToViewInterfaceValue("colorByParameter");
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc(viewContext);

    const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;

    const scatterType =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            ? "scattergl"
            : "scatter";

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

    const plotBuilder = new PlotBuilder(
        subplotOwner,
        vectorSpecifications ?? [],
        resampleFrequency,
        makeEnsembleDisplayName,
        colorSet,
        wrapperDivSize.width,
        wrapperDivSize.height,
        ensemblesParameterColoring ?? undefined,
        subplotLimitation.direction,
        subplotLimitation.maxDirectionElements,
        scatterType,
    );

    // Add traces based on visualization mode
    if (
        colorByParameter &&
        ensemblesParameterColoring &&
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS
    ) {
        plotBuilder.addRealizationTracesColoredByParameter(loadedVectorSpecificationsAndRealizationData);
    }
    if (!colorByParameter && visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
        const useIncreasedBrightness = false;
        plotBuilder.addRealizationsTraces(loadedVectorSpecificationsAndRealizationData, useIncreasedBrightness);
    }
    if (visualizationMode === VisualizationMode.STATISTICAL_FANCHART) {
        const selectedVectorsFanchartStatisticData = filterVectorSpecificationAndFanchartStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.FanchartStatisticsSelection,
        );
        plotBuilder.addFanchartTraces(selectedVectorsFanchartStatisticData);
    }
    if (visualizationMode === VisualizationMode.STATISTICAL_LINES) {
        const highlightStatistics = false;
        const selectedVectorsIndividualStatisticData = filterVectorSpecificationAndIndividualStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.IndividualStatisticsSelection,
        );
        plotBuilder.addStatisticsTraces(selectedVectorsIndividualStatisticData, highlightStatistics);
    }
    if (visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS) {
        const useIncreasedBrightness = true;
        const highlightStatistics = true;
        const selectedVectorsIndividualStatisticData = filterVectorSpecificationAndIndividualStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.IndividualStatisticsSelection,
        );
        plotBuilder.addRealizationsTraces(loadedVectorSpecificationsAndRealizationData, useIncreasedBrightness);
        plotBuilder.addStatisticsTraces(selectedVectorsIndividualStatisticData, highlightStatistics);
    }
    if (showHistorical) {
        plotBuilder.addHistoryTraces(loadedRegularEnsembleVectorSpecificationsAndHistoricalData);
    }
    if (showObservations) {
        plotBuilder.addObservationsTraces(loadedVectorSpecificationsAndObservationData);
    }

    if (activeTimestampUtcMs) {
        plotBuilder.addTimeAnnotation(activeTimestampUtcMs);
    }

    return plotBuilder;
}
