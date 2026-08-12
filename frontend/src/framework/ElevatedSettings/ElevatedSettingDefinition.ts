import type { RegisterElevatedSettingOptions } from "./ElevatedSettingRegistry";

export class ElevatedSettingDefinition<TValue, TConstraints> {
    readonly key: string;
    readonly defaultValue: TValue;
    readonly initialConstraints: TConstraints;

    private readonly _combineConstraints: (accumulator: TConstraints, current: TConstraints) => TConstraints;
    private readonly _isValueValid?: (value: TValue, constraints: TConstraints) => boolean;

    constructor(options: RegisterElevatedSettingOptions<TValue, TConstraints>) {
        this.key = options.key;
        this.defaultValue = options.defaultValue;
        this.initialConstraints = options.initialConstraints;
        this._combineConstraints = options.combineConstraints;
        this._isValueValid = options.isValueValid;
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
}
