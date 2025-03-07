import type { Setting } from "../interfaces";

export class SettingRegistry {
    private static _registeredSettings: Record<string, { new (params?: any): Setting<any> }> = {};

    static registerSetting(ctor: { new (params?: any): Setting<any> }): void {
        this._registeredSettings[ctor.name] = ctor;
    }

    static makeSetting(settingName: string, params?: any[]): Setting<any> {
        const ctor = this._registeredSettings[settingName];
        if (params) {
            return new ctor(...params);
        }
        return new ctor();
    }
}
