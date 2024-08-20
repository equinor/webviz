export type SeismicAddress = {
    caseUuid: string;
    ensemble: string;
    realizationNumber: number;
    attribute: string;
    observed: boolean;
    timeString?: string;
};

export type SurfaceAddress = {
    caseUuid: string;
    ensemble: string;
    realizationNumber: number;
    surfaceNames: string[];
    attribute: string;
};

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
