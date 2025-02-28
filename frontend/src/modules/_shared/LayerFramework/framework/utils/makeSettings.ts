import { Settings } from "../../interfaces";
import { SettingRegistry } from "../../settings/SettingRegistry";
import { SettingTypes } from "../../settings/settingsTypes";
import { Setting } from "../Setting/Setting";


export function makeSettings<
    const TSettingTypes extends Settings,
    const TSettings extends {[K in TSettingTypes[number]]: SettingTypes[K]}
>(
    settings: TSettingTypes,
    defaultValues: TSettings
): { [K in keyof TSettingTypes & keyof SettingTypes]: Setting<SettingTypes[K]> } {
    const returnValue: Record<string, Setting<any>> = {} as Record<string, Setting<any>>;
    for (let i = 0; i < settings.length; i++) {
        const key = settings[i];
        returnValue[key] = SettingRegistry.makeSetting(key, defaultValues[key as keyof TSettings] as SettingTypes[typeof key]);
    }
    return returnValue as {
        [K in keyof TSettingTypes & keyof SettingTypes]: Setting<SettingTypes[K]>;
    };
}