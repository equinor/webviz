import { Wellbore } from "@framework/Wellbore";

export type SurfaceSetSpec = {
    caseUuid: string;
    ensembleName: string;
    names: string[];
    attribute: string;
    realizationNums: number[] | null;
};
export interface State {
    wellboreAddress: Wellbore | null;
    surfaceSetSpec: SurfaceSetSpec | null;
    extension: number;
    zScale: number;
}
