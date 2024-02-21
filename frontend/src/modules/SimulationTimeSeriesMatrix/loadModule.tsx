import { Frequency_api, StatisticFunction_api } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { FanchartStatisticOption, GroupBy, State, VisualizationMode } from "./state";
import { View } from "./view";

const defaultState: State = {
    groupBy: GroupBy.TIME_SERIES,
    colorRealizationsByParameter: false,
    parameterIdent: null,
    visualizationMode: VisualizationMode.STATISTICAL_FANCHART,
    vectorSpecifications: [],
    resamplingFrequency: Frequency_api.MONTHLY,
    showObservations: true,
    showHistorical: true,
    statisticsSelection: {
        IndividualStatisticsSelection: Object.values(StatisticFunction_api),
        FanchartStatisticsSelection: Object.values(FanchartStatisticOption),
    },
};

const module = ModuleRegistry.initModule<State>("SimulationTimeSeriesMatrix", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
