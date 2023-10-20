export type SeismicAddress = {
    caseUuid: string;
    ensemble: string;
    realizationNumber: number;
    attribute: string;
    observed: boolean;
    timeString?: string;
};

export enum SurveyType {
    SEISMIC_3D = "3D",
    SEISMIC_4D = "4D",
}
