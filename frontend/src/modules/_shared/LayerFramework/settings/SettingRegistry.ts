import { Setting, SettingCategories, SettingTypes } from "./settingsTypes";

import { SettingManager } from "../framework/SettingManager/Setting";
import { CustomSettingImplementation } from "../interfaces";

export class SettingRegistry {
    private static _registeredSettings: Map<
        Setting,
        {
            label: string;
            customSettingImplementation: { new (customParams?: any): CustomSettingImplementation<any, any> };
            customParams?: any;
        }
    > = new Map();

    static registerSetting<
        TSetting extends Setting,
        TSettingType extends SettingTypes[TSetting] = SettingTypes[TSetting],
        TSettingCategory extends SettingCategories[TSetting] = SettingCategories[TSetting],
        TSettingImpl extends new (...args: any) => CustomSettingImplementation<TSettingType, TSettingCategory> = {
            new (params?: any): CustomSettingImplementation<TSettingType, TSettingCategory>;
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

    static makeSetting<T extends Setting>(
        type: T,
        defaultValue: SettingTypes[T]
    ): SettingManager<SettingTypes[T], SettingCategories[T]> {
        const stored = this._registeredSettings.get(type);
        if (!stored) {
            throw new Error(`Setting ${type} not found`);
        }
        const customSettingImpl = new stored.customSettingImplementation(...(stored.customParams ?? []));

        return new SettingManager({
            type,
            label: stored.label,
            defaultValue,
            customSettingImplementation: customSettingImpl,
        });
    }
}
