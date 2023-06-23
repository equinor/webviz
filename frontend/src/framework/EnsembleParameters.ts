export type Parameter = {
    readonly name: string;
    readonly isLogarithmic: boolean;    // Only applicable for numerical/float arrays?
    readonly isNumerical: boolean;
    readonly isConstant: boolean;
    readonly groupName?: string;
    readonly descriptiveName?: string;
    readonly realizations: number[];       // The two arrays, realizations and values, must always be same length
    readonly values: number[] | string[];  // Array items can be string, int or float. Should probably be Float32Array, Int32Array or string[] instead.
};

export class EnsembleParameters {
    private _parameterArr: Parameter[];

    constructor(parameterArr: Parameter[]) {
        this._parameterArr = parameterArr;
    }

    getParameterNames(): string[] {
        return this._parameterArr.map((par) => par.name);
    }

    getParameterArr(): readonly Parameter[] {
        return this._parameterArr;
    }
}
