import { AllSettingTypes, SettingType } from "./settingsTypes";

import { Setting } from "../interfaces";

export class SettingRegistry {
    private static _registeredSettings: Record<string, { new (params?: any): Setting<any> }> = {};

    static registerSetting(ctor: { new (params?: any): Setting<any> }): void {
        this._registeredSettings[ctor.name] = ctor;
    }

    static makeSetting<T extends SettingType>(settingType: T, params?: any[]): Setting<AllSettingTypes[T]> {
        const ctor = this._registeredSettings[settingType];
        if (params) {
            return new ctor(...params);
        }
        return new ctor();
    }
}
