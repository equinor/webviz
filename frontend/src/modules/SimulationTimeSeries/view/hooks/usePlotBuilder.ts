import React from "react";

import { SummaryVectorObservations_api } from "@api";
import { ViewContext } from "@framework/ModuleContext";
import { ColorSet } from "@lib/utils/ColorSet";
import { Size2D } from "@lib/utils/geometry";
import { Interfaces } from "@modules/SimulationTimeSeries/interfaces";

import { useAtomValue } from "jotai";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

import { GroupBy, VectorSpec, VisualizationMode } from "../../typesAndEnums";
import {
    activeTimestampUtcMsAtom,
    loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    loadedVectorSpecificationsAndStatisticsDataAtom,
} from "../atoms/derivedAtoms";
import { vectorObservationsQueriesAtom } from "../atoms/queryAtoms";
import { PlotBuilder, SubplotOwner } from "../utils/PlotBuilder";
import { EnsemblesContinuousParameterColoring } from "../utils/ensemblesContinuousParameterColoring";
import {
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "../utils/vectorSpecificationsAndQueriesUtils";

export function usePlotBuilder(
    viewContext: ViewContext<Interfaces>,
    wrapperDivSize: Size2D,
    colorSet: ColorSet,
    ensemblesParameterColoring: EnsemblesContinuousParameterColoring | null,
    handlePlotOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined
): React.ReactNode {
    const groupBy = viewContext.useSettingsToViewInterfaceValue("groupBy");
    const visualizationMode = viewContext.useSettingsToViewInterfaceValue("visualizationMode");
    const showObservations = viewContext.useSettingsToViewInterfaceValue("showObservations");
    const vectorSpecifications = viewContext.useSettingsToViewInterfaceValue("vectorSpecifications");
    const showHistorical = viewContext.useSettingsToViewInterfaceValue("showHistorical");
    const statisticsSelection = viewContext.useSettingsToViewInterfaceValue("statisticsSelection");
    const subplotLimitation = viewContext.useSettingsToViewInterfaceValue("subplotLimitation");

    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const loadedVectorSpecificationsAndStatisticsData = useAtomValue(loadedVectorSpecificationsAndStatisticsDataAtom);
    const loadedRegularEnsembleVectorSpecificationsAndHistoricalData = useAtomValue(
        loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom
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
        makeEnsembleDisplayName,
        colorSet,
        wrapperDivSize.width,
        wrapperDivSize.height,
        ensemblesParameterColoring ?? undefined,
        subplotLimitation.direction,
        subplotLimitation.maxDirectionElements,
        scatterType
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
            statisticsSelection.FanchartStatisticsSelection
        );
        plotBuilder.addFanchartTraces(selectedVectorsFanchartStatisticData);
    }
    if (visualizationMode === VisualizationMode.STATISTICAL_LINES) {
        const highlightStatistics = false;
        const selectedVectorsIndividualStatisticData = filterVectorSpecificationAndIndividualStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.IndividualStatisticsSelection
        );
        plotBuilder.addStatisticsTraces(selectedVectorsIndividualStatisticData, highlightStatistics);
    }
    if (visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS) {
        const useIncreasedBrightness = true;
        const highlightStatistics = true;
        const selectedVectorsIndividualStatisticData = filterVectorSpecificationAndIndividualStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.IndividualStatisticsSelection
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

    const plot = plotBuilder.build(handlePlotOnClick);

    return plot;
}
