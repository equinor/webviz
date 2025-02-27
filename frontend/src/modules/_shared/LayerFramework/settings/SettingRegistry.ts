import { AllSettingTypes, SettingType } from "./settingsTypes";

import { Setting } from "../interfaces";

export class SettingRegistry {
    private static _registeredSettings: Map<
        SettingType,
        {
            setting: { new (customParams?: any): Setting<any> };
            customParams?: any;
        }
    > = new Map();

    static registerSetting<TSetting extends { new (params?: any): Setting<any> }>(
        type: SettingType,
        setting: TSetting,
        customParams?: ConstructorParameters<TSetting>
    ): void {
        if (this._registeredSettings.has(type)) {
            throw new Error(`Setting ${type} already registered`);
        }
        this._registeredSettings.set(type, {
            setting,
            customParams,
        });
    }

    static makeSetting<T extends SettingType>(type: T): Setting<AllSettingTypes[T]> {
        const stored = this._registeredSettings.get(type);
        if (!stored) {
            throw new Error(`Setting ${type} not found`);
        }
        const setting = new stored.setting(...(stored.customParams ?? []));
        return setting;
    }
}
