import { ElevatedSettingDefinition } from "./ElevatedSettingDefinition";

export type RegisterElevatedSettingOptions<TValue, TConstraints> = {
    key: string;

    defaultValue: TValue;

    initialConstraints: TConstraints;

    combineConstraints: (accumulator: TConstraints, current: TConstraints) => TConstraints;

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
