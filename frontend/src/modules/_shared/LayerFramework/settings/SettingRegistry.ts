import { Setting, SettingCategories, SettingTypes, settingCategories } from "./settingsDefinitions";

import { SettingManager } from "../framework/SettingManager/SettingManager";
import { CustomSettingImplementation } from "../interfaces";

export class SettingRegistry {
    private static _registeredSettings: Map<
        Setting,
        {
            label: string;
            customSettingImplementation: {
                new (customConstructorParameters?: any): CustomSettingImplementation<any, any>;
            };
            customConstructorParameters?: any;
        }
    > = new Map();

    static registerSetting<
        TSetting extends Setting,
        TValue extends SettingTypes[TSetting] = SettingTypes[TSetting],
        TCategory extends SettingCategories[TSetting] = SettingCategories[TSetting],
        TSettingImpl extends new (...args: any) => CustomSettingImplementation<TValue, TCategory> = {
            new (params?: any): CustomSettingImplementation<TValue, TCategory>;
        }
    >(
        type: TSetting,
        label: string,
        customSettingImplementation: TSettingImpl,
        options?: {
            customConstructorParameters?: ConstructorParameters<TSettingImpl>;
        }
    ): void {
        if (this._registeredSettings.has(type)) {
            throw new Error(`Setting ${type} already registered`);
        }
        this._registeredSettings.set(type, {
            label,
            customSettingImplementation,
            customConstructorParameters: options?.customConstructorParameters,
        });
    }

    static makeSetting<TSetting extends Setting>(
        type: TSetting,
        defaultValue?: SettingTypes[TSetting]
    ): SettingManager<TSetting> {
        const stored = this._registeredSettings.get(type);
        if (!stored) {
            throw new Error(`Setting ${type} not found`);
        }
        const customSettingImpl = new stored.customSettingImplementation(...(stored.customConstructorParameters ?? []));

        return new SettingManager<TSetting>({
            type,
            category: settingCategories[type],
            label: stored.label,
            defaultValue: defaultValue ?? customSettingImpl.defaultValue ?? null,
            customSettingImplementation: customSettingImpl,
        });
    }
}
