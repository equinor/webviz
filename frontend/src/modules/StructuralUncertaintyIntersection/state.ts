import { Wellbore } from "@framework/Wellbore";

import { IntersectionSettings, SurfaceSetAddress, VisualizationMode } from "./types";
import { StatisticFunction_api } from "@api";


export interface State {
    wellboreAddress: Wellbore | null;
    SurfaceSetAddress: SurfaceSetAddress | null;
    visualizationMode: VisualizationMode;
    stratigraphyColorMap: { [name: string]: string };
    statisticFunctions: StatisticFunction_api[];
    intersectionSettings: IntersectionSettings;
}


