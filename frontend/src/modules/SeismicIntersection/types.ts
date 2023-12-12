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
