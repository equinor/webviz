import { useAtomValue } from "jotai";

import type { ViewContext } from "@framework/ModuleContext";
import type { Size2D } from "@lib/utils/geometry";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";

import type { VectorHexColorMap } from "../../typesAndEnums";
import { VisualizationMode } from "../../typesAndEnums";
import { resampleFrequencyAtom } from "../atoms/baseAtoms";
import {
    activeTimestampUtcMsAtom,
    loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom,
    loadedVectorSpecificationsAndObservationDataAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    loadedVectorSpecificationsAndStatisticsDataAtom,
} from "../atoms/derivedAtoms";
import type { EnsemblesContinuousParameterColoring } from "../utils/ensemblesContinuousParameterColoring";
import { PlotBuilder } from "../utils/PlotBuilder";
import type { SubplotOwner } from "../utils/PlotBuilder";
import {
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "../utils/vectorSpecificationsAndQueriesUtils";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

export function usePlotBuilder(
    viewContext: ViewContext<Interfaces>,
    wrapperDivSize: Size2D,
    vectorHexColorMap: VectorHexColorMap,
    subplotOwner: SubplotOwner,
    ensemblesParameterColoring: EnsemblesContinuousParameterColoring | null,
): PlotBuilder {
    const visualizationMode = viewContext.useSettingsToViewInterfaceValue("visualizationMode");
    const showObservations = viewContext.useSettingsToViewInterfaceValue("showObservations");
    const vectorSpecifications = viewContext.useSettingsToViewInterfaceValue("vectorSpecifications");
    const showHistorical = viewContext.useSettingsToViewInterfaceValue("showHistorical");
    const statisticsSelection = viewContext.useSettingsToViewInterfaceValue("statisticsSelection");
    const subplotLimitation = viewContext.useSettingsToViewInterfaceValue("subplotLimitation");

    const resampleFrequency = useAtomValue(resampleFrequencyAtom);
    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const loadedVectorSpecificationsAndStatisticsData = useAtomValue(loadedVectorSpecificationsAndStatisticsDataAtom);
    const loadedVectorSpecificationsAndObservationData = useAtomValue(loadedVectorSpecificationsAndObservationDataAtom);
    const loadedVectorSpecificationsAndHistoricalData = useAtomValue(
        loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom,
    );
    const colorByParameter = viewContext.useSettingsToViewInterfaceValue("colorByParameter");
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc(viewContext);

    const scatterType =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            ? "scattergl"
            : "scatter";

    const plotBuilder = new PlotBuilder(
        subplotOwner,
        vectorSpecifications ?? [],
        resampleFrequency,
        makeEnsembleDisplayName,
        vectorHexColorMap,
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

    // Observations and historical data
    if (showHistorical) {
        plotBuilder.addHistoryTraces(loadedVectorSpecificationsAndHistoricalData);
    }
    if (showObservations) {
        plotBuilder.addObservationsTraces(loadedVectorSpecificationsAndObservationData);
    }

    // Add time annotation if active timestamp is set
    if (activeTimestampUtcMs) {
        plotBuilder.addTimeAnnotation(activeTimestampUtcMs);
    }

    plotBuilder.prepareLegendsAndTitles();
    plotBuilder.prepareAnnotations();

    return plotBuilder;
}
