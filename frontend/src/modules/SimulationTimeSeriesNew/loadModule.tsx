import { Frequency_api, StatisticFunction_api } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { GroupBy, State, VisualizationMode } from "./state";
import { view } from "./view";

const defaultState: State = {
    groupBy: GroupBy.TimeSeries,
    visualizationMode: VisualizationMode.IndividualRealizations,
    vectorSpecifications: [],
    resamplingFrequency: Frequency_api.MONTHLY,
    showObservations: true,
    showHistorical: true,
    statisticsToInclude: [
        StatisticFunction_api.MEAN,
        StatisticFunction_api.MIN,
        StatisticFunction_api.MAX,
        StatisticFunction_api.P10,
        StatisticFunction_api.P50,
        StatisticFunction_api.P90,
    ],
    realizationsToInclude: null,
};

const module = ModuleRegistry.initModule<State>("SimulationTimeSeriesNew", defaultState);

module.viewFC = view;
module.settingsFC = settings;
