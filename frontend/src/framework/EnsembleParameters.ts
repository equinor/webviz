export type Parameter = {
    readonly name: string;
    readonly isLogarithmic: boolean;
    readonly isNumerical: boolean;
    readonly isConstant: boolean;
    readonly groupName?: string;
    readonly descriptiveName?: string;
    readonly values: number[] | string[]; // string, int, float The two arrays, values and realizations, must always be same length
    readonly realizations: number[];
};

export class EnsembleParameters {
    private _parameterArr: Parameter[];

    constructor(parameterArr: Parameter[]) {
        this._parameterArr = parameterArr;
    }
}
