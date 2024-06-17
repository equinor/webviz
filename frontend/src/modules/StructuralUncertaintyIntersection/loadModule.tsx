import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State } from "./state";
import { StatisticOption, VisualizationMode } from "./types";
import { View } from "./view";

const defaultState: State = {
    wellboreAddress: { uwi: "55/33-A-4", uuid: "drogon_horizontal", type: "smda" },
    SurfaceSetAddress: null,
    visualizationMode: VisualizationMode.STATISTICAL_LINES,
    statisticFunctions: [StatisticOption.MEAN, StatisticOption.MIN_MAX, StatisticOption.P10_P90, StatisticOption.P50],
    stratigraphyColorMap: {},
    intersectionSettings: {
        extension: 1000,
        zScale: 5,
    },
};

const module = ModuleRegistry.initModule<State>("StructuralUncertaintyIntersection", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
