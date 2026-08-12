import { ElevatedSettingDefinition } from "./ElevatedSettingDefinition";

// How constraint contributions from different consumers (e.g. one per module instance using the
// setting) are combined into the aggregated constraints a value is validated against.
export enum ElevatedSettingConstraintMode {
    // A value is allowed if any consumer allows it - the broadest selection. Default, since most
    // settings are opt-in per consumer rather than something every consumer must support.
    UNION = "union",
    // A value is allowed only if every consumer allows it - use this when the setting drives
    // something that must be valid everywhere it's consumed (e.g. a single realization number
    // that every realization-scoped module on the dashboard has to be able to display).
    INTERSECTION = "intersection",
}

export type RegisterElevatedSettingOptions<TValue, TConstraints> = {
    key: string;

    defaultValue: TValue;

    initialConstraints: TConstraints;

    // Only used to combine consumer contributions when `combineConstraints` isn't given - requires
    // `TConstraints` to be an array type. Defaults to `ElevatedSettingConstraintMode.UNION`.
    constraintMode?: ElevatedSettingConstraintMode;

    // Escape hatch for non-array `TConstraints`, or combination logic `constraintMode` can't express.
    // Overrides `constraintMode` when given.
    combineConstraints?: (accumulator: TConstraints, current: TConstraints) => TConstraints;

    isValueValid?: (value: TValue, constraints: TConstraints) => boolean;
};

export class ElevatedSettingRegistry {
    private static _registeredSettings: Record<string, ElevatedSettingDefinition<any, any>> = {};

    private constructor() {}

    static registerElevatedSetting<TValue, TConstraints>(
        options: RegisterElevatedSettingOptions<TValue, TConstraints>,
    ): ElevatedSettingDefinition<TValue, TConstraints> {
        if (this._registeredSettings[options.key]) {
            throw new Error(`Elevated setting with key '${options.key}' is already registered.`);
        }

        const settingDefinition = new ElevatedSettingDefinition<TValue, TConstraints>(options);
        this._registeredSettings[options.key] = settingDefinition;
        return settingDefinition;
    }

    static getRegisteredSetting(key: string): ElevatedSettingDefinition<any, any> | undefined {
        return this._registeredSettings[key];
    }

    static getRegisteredSettings(): Record<string, ElevatedSettingDefinition<any, any>> {
        return this._registeredSettings;
    }
}
