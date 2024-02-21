import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";
import { VisualizationMode } from "./types";
import { StatisticFunction_api } from "@api";

const defaultState: State = {
    wellboreAddress: { uwi: "55/33-A-4", uuid: "drogon_horizontal", type: "smda" },
    SurfaceSetAddress: null,
    visualizationMode: VisualizationMode.STATISTICAL_LINES,
    statisticFunctions: [StatisticFunction_api.MEAN],
    stratigraphyColorMap: {},
    intersectionSettings: {
        extension: 1000,
        zScale: 5,
    },
};

const module = ModuleRegistry.initModule<State>("StructuralUncertaintyIntersection", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
