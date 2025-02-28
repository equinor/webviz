import { SettingType, SettingTypes } from "./settingsTypes";

import { Setting } from "../framework/Setting/Setting";
import { CustomSettingImplementation } from "../interfaces";

type ExtractValueType<C extends new (...args: any) => CustomSettingImplementation<any>> = C extends new (
    ...args: any
) => CustomSettingImplementation<infer T>
    ? T
    : never;

export class SettingRegistry {
    private static _registeredSettings: Map<
        SettingType,
        {
            label: string;
            customSettingImplementation: { new (customParams?: any): CustomSettingImplementation<any> };
            customParams?: any;
        }
    > = new Map();

    static registerSetting<
        TSetting extends SettingType,
        TSettingType extends SettingTypes[TSetting] = SettingTypes[TSetting],
        TSettingImpl extends new (...args: any) => CustomSettingImplementation<TSettingType> = {
            new (params?: any): CustomSettingImplementation<TSettingType>;
        }
    >(
        type: TSetting,
        label: string,
        customSettingImplementation: TSettingImpl,
        customParams?: ConstructorParameters<TSettingImpl>
    ): void {
        if (this._registeredSettings.has(type)) {
            throw new Error(`Setting ${type} already registered`);
        }
        this._registeredSettings.set(type, {
            label,
            customSettingImplementation,
            customParams,
        });
    }

    static makeSetting<T extends SettingType>(type: T, defaultValue: SettingTypes[T]): Setting<SettingTypes[T]> {
        const stored = this._registeredSettings.get(type);
        if (!stored) {
            throw new Error(`Setting ${type} not found`);
        }
        const customSettingImpl = new stored.customSettingImplementation(...(stored.customParams ?? []));

        return new Setting({
            type,
            label: stored.label,
            defaultValue,
            customSettingImplementation: customSettingImpl,
        });
    }
}
