import { Wellbore } from "@framework/types/wellbore";

import { IntersectionSettings, StatisticOption, SurfaceSetAddress, VisualizationMode } from "./types";

export interface State {
    wellboreAddress: Wellbore | null;
    SurfaceSetAddress: SurfaceSetAddress | null;
    visualizationMode: VisualizationMode;
    stratigraphyColorMap: { [name: string]: string };
    statisticFunctions: StatisticOption[];
    intersectionSettings: IntersectionSettings;
}
