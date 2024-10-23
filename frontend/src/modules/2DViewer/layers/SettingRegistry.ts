import { Setting } from "./interfaces";

export class SettingRegistry {
    private static _registeredSettings: Record<string, { new (): Setting<any> }> = {};

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    static registerSetting(ctor: { new (): Setting<any> }): void {
        this._registeredSettings[ctor.name] = ctor;
    }

    static makeSetting(settingName: string): Setting<any> {
        return new this._registeredSettings[settingName]();
    }
}
