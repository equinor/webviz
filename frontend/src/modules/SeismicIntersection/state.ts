import { Wellbore } from "@framework/types/wellbore";

import { SeismicAddress, SurfaceAddress } from "./types";

export enum WellborePickSelectionType {
    NONE = "None",
    ALL = "All",
    SELECTED_SURFACES = "SelectedSurfaces",
}

export const WellborePickSelectionTypeEnumToStringMapping = {
    [WellborePickSelectionType.NONE]: "None",
    [WellborePickSelectionType.ALL]: "All",
    [WellborePickSelectionType.SELECTED_SURFACES]: "Selected Surfaces",
};

export interface State {
    wellboreAddress: Wellbore | null;
    seismicAddress: SeismicAddress | null;
    surfaceAddress: SurfaceAddress | null;
    wellborePickCaseUuid: string | null;
    wellborePickSelection: WellborePickSelectionType;
    extension: number;
    zScale: number;
}
