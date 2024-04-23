import { SummaryVectorObservations_api } from "@api";
import { ViewContext } from "@framework/ModuleContext";
import { ColorSet } from "@lib/utils/ColorSet";
import { Size2D } from "@lib/utils/geometry";
import { SettingsAtoms } from "@modules/SimulationTimeSeries/settings/atoms/atomDefinitions";
import { Interface } from "@modules/SimulationTimeSeries/settingsToViewInterface";
import { State } from "@modules/SimulationTimeSeries/state";

import { Layout } from "plotly.js";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

import { GroupBy, VectorSpec, VisualizationMode } from "../../typesAndEnums";
import { ViewAtoms } from "../atoms/atomDefinitions";
import { EnsemblesContinuousParameterColoring } from "../utils/ensemblesContinuousParameterColoring";
import { SubplotBuilder, SubplotOwner } from "../utils/subplotBuilder";
import { TimeSeriesPlotData } from "../utils/timeSeriesPlotData";
import {
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "../utils/vectorSpecificationsAndQueriesUtils";

export function useSubplotBuilder(
    viewContext: ViewContext<State, Interface, SettingsAtoms, ViewAtoms>,
    wrapperDivSize: Size2D,
    colorSet: ColorSet,
    ensemblesParameterColoring: EnsemblesContinuousParameterColoring | null
): [Partial<TimeSeriesPlotData>[], Partial<Layout>] {
    const groupBy = viewContext.useSettingsToViewInterfaceValue("groupBy");
    const visualizationMode = viewContext.useSettingsToViewInterfaceValue("visualizationMode");
    const showObservations = viewContext.useSettingsToViewInterfaceValue("showObservations");
    const vectorSpecifications = viewContext.useSettingsToViewInterfaceValue("vectorSpecifications");
    const showHistorical = viewContext.useSettingsToViewInterfaceValue("showHistorical");
    const statisticsSelection = viewContext.useSettingsToViewInterfaceValue("statisticsSelection");

    const vectorObservationsQueries = viewContext.useViewAtomValue("vectorObservationsQueries");
    const loadedVectorSpecificationsAndRealizationData = viewContext.useViewAtomValue(
        "loadedVectorSpecificationsAndRealizationData"
    );
    const loadedVectorSpecificationsAndStatisticsData = viewContext.useViewAtomValue(
        "loadedVectorSpecificationsAndStatisticsData"
    );
    const loadedVectorSpecificationsAndHistoricalData = viewContext.useViewAtomValue(
        "loadedVectorSpecificationsAndHistoricalData"
    );
    const colorByParameter = viewContext.useSettingsToViewInterfaceValue("colorByParameter");
    const activeTimestampUtcMs = viewContext.useViewAtomValue("activeTimestampUtcMs");

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
