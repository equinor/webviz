import { Frequency_api, StatisticFunction_api } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { FanchartStatisticOption, GroupBy, State, VisualizationMode } from "./state";
import { view } from "./view";

const defaultState: State = {
    groupBy: GroupBy.TIME_SERIES,
    visualizationMode: VisualizationMode.INDIVIDUAL_REALIZATIONS,
    vectorSpecifications: [],
    resamplingFrequency: Frequency_api.MONTHLY,
    showObservations: true,
    showHistorical: true,
    statisticsSelection: {
        IndividualStatisticsSelection: Object.values(StatisticFunction_api),
        FanchartStatisticsSelection: Object.values(FanchartStatisticOption),
    },
    realizationsToInclude: null,
};

const module = ModuleRegistry.initModule<State>("SimulationTimeSeriesMatrix", defaultState);

module.viewFC = view;
module.settingsFC = settings;
