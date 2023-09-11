import { MinMax } from "@lib/utils/MinMax";

export enum ParameterType {
    CONTINUOUS,
    DISCRETE,
}

export type ContinuousParameter = {
    readonly type: ParameterType.CONTINUOUS;
    readonly name: string;
    readonly groupName: string | null;
    readonly description?: string;
    readonly isConstant: boolean;
    readonly isLogarithmic: boolean;
    readonly realizations: number[]; // The two arrays, realizations and values, must always be same length
    readonly values: number[]; // Array items will be floating point.
};

export type DiscreteParameter = {
    readonly type: ParameterType.DISCRETE;
    readonly name: string;
    readonly groupName: string | null;
    readonly description?: string;
    readonly isConstant: boolean;
    readonly realizations: number[]; // The two arrays, realizations and values, must always be same length
    readonly values: number[] | string[]; // Array items can be string or int. Should maybe utilize Int32Array or string[] instead?
};

export type Parameter = ContinuousParameter | DiscreteParameter;

export class ParameterIdent {
    readonly name: string;
    readonly groupName: string | null;

    constructor(name: string, groupName: string | null) {
        this.name = name;
        this.groupName = groupName;
    }

    static fromNameAndGroup(name: string, groupName: string | null): ParameterIdent {
        return new ParameterIdent(name, groupName);
    }

    static fromString(paramIdentString: string): ParameterIdent {
        const parts = paramIdentString.split("~@@~");
        if (parts.length === 1) {
            return new ParameterIdent(parts[0], null);
        }
        if (parts.length === 2) {
            return new ParameterIdent(parts[0], parts[1]);
        } 

        throw new Error(`Invalid parameter ident string: ${paramIdentString}`);
    }

    toString(): string {
        if (this.groupName) {
            return `${this.name}~@@~${this.groupName}`;
        } else {
            return this.name;
        }
    }

    equals(otherIdent: ParameterIdent | null): boolean {
        if (!otherIdent) {
            return false;
        }
        if (otherIdent === this) {
            return true;
        }

        return this.name === otherIdent.name && this.groupName === otherIdent.groupName;
    }
}

export class EnsembleParameters {
    private _parameterArr: Parameter[];

    constructor(parameterArr: Parameter[]) {
        this._parameterArr = parameterArr;
    }

    getParameterIdents(requiredParamType: ParameterType | null): ParameterIdent[] {
        const identArr: ParameterIdent[] = [];
        for (const par of this._parameterArr) {
            if (requiredParamType == null || par.type === requiredParamType) {
                identArr.push(new ParameterIdent(par.name, par.groupName));
            }
        }

        return identArr;
    }

    hasParameter(paramIdent: ParameterIdent): boolean {
        return this.findParameter(paramIdent) !== null;
    }

    getParameter(paramIdent: ParameterIdent): Parameter {
        const par = this.findParameter(paramIdent);
        if (!par) {
            throw new Error(`Parameter ${paramIdent.name} (group=${paramIdent.groupName}) not found`);
        }
        return par;
    }

    getContinuousParameterMinMax(paramIdent: ParameterIdent): MinMax {
        const par = this.getParameter(paramIdent);
        if (par.type !== ParameterType.CONTINUOUS) {
            throw new Error(`Parameter ${paramIdent.name} (group=${paramIdent.groupName}) is not of type continuous`);
        }

        return MinMax.fromNumericValues(par.values);
    }

    findParameter(paramIdent: ParameterIdent): Parameter | null {
        for (const par of this._parameterArr) {
            if (par.name === paramIdent.name && par.groupName === paramIdent.groupName) {
                return par;
            }
        }

        return null;
    }

    getParameterArr(): readonly Parameter[] {
        return this._parameterArr;
    }
}
