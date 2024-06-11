import { StatisticFunction_api } from "@api";
import { Wellbore } from "@framework/types/wellbore";

import { IntersectionSettings, SurfaceSetAddress, VisualizationMode } from "./types";

export interface State {
    wellboreAddress: Wellbore | null;
    SurfaceSetAddress: SurfaceSetAddress | null;
    visualizationMode: VisualizationMode;
    stratigraphyColorMap: { [name: string]: string };
    statisticFunctions: StatisticFunction_api[];
    intersectionSettings: IntersectionSettings;
}
