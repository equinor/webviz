import { ElevatedSettingConstraintMode, type RegisterElevatedSettingOptions } from "./ElevatedSettingRegistry";

// `TConstraints` isn't statically known to be an array here - these back `constraintMode`, which by
// contract only applies when it is (see `RegisterElevatedSettingOptions`).
function unionConstraints<TConstraints>(accumulator: TConstraints, current: TConstraints): TConstraints {
    const accArr = accumulator as readonly unknown[];
    const curArr = current as readonly unknown[];
    return Array.from(new Set([...accArr, ...curArr])) as TConstraints;
}

function intersectionConstraints<TConstraints>(accumulator: TConstraints, current: TConstraints): TConstraints {
    const accArr = accumulator as readonly unknown[];
    const curArr = current as readonly unknown[];
    return accArr.filter((value) => curArr.includes(value)) as TConstraints;
}

function makeDefaultCombineConstraints<TConstraints>(
    mode: ElevatedSettingConstraintMode,
): (accumulator: TConstraints, current: TConstraints) => TConstraints {
    return mode === ElevatedSettingConstraintMode.INTERSECTION ? intersectionConstraints : unionConstraints;
}

export class ElevatedSettingDefinition<TValue, TConstraints> {
    readonly key: string;
    readonly defaultValue: TValue;
    readonly initialConstraints: TConstraints;

    private readonly _combineConstraints: (accumulator: TConstraints, current: TConstraints) => TConstraints;
    private readonly _isValueValid?: (value: TValue, constraints: TConstraints) => boolean;
    private readonly _fixupValue?: (value: TValue, constraints: TConstraints) => TValue;

    constructor(options: RegisterElevatedSettingOptions<TValue, TConstraints>) {
        this.key = options.key;
        this.defaultValue = options.defaultValue;
        this.initialConstraints = options.initialConstraints;
        this._combineConstraints =
            options.combineConstraints ??
            makeDefaultCombineConstraints(options.constraintMode ?? ElevatedSettingConstraintMode.UNION);
        this._isValueValid = options.isValueValid;
        this._fixupValue = options.fixupValue;
    }

    combineConstraints(accumulator: TConstraints, current: TConstraints): TConstraints {
        return this._combineConstraints(accumulator, current);
    }

    isValueValid(value: TValue, constraints: TConstraints): boolean {
        if (this._isValueValid) {
            return this._isValueValid(value, constraints);
        }
        return true;
    }

    // See `RegisterElevatedSettingOptions.fixupValue` - callers are responsible for only invoking
    // this on the first constraints change, since the definition itself has no notion of "first".
    fixupValue(value: TValue, constraints: TConstraints): TValue {
        if (this._fixupValue) {
            return this._fixupValue(value, constraints);
        }
        return value;
    }
}
