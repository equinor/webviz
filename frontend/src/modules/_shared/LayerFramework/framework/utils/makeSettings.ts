import { Settings, TupleIndices } from "../../interfaces";
import { SettingRegistry } from "../../settings/SettingRegistry";
import { MakeSettingTypesMap, SettingTypes } from "../../settings/settingsTypes";
import { SettingManager } from "../SettingManager/SettingManager";


export function makeSettings<
    const TSettings extends Settings,
    const TSettingTypes extends MakeSettingTypesMap<TSettings>,
    const TSettingKey extends TupleIndices<TSettings> = TupleIndices<TSettings>
>(
    settings: TSettings,
    defaultValues: TSettingTypes
): { [K in TSettingKey]: SettingManager<TSettings[K]> } {
    const returnValue: Record<string, SettingManager<any>> = {} as Record<string, SettingManager<any>>;
    for (let i = 0; i < settings.length; i++) {
        const key = settings[i];
        returnValue[key] = SettingRegistry.makeSetting(key, defaultValues[key as keyof TSettingTypes] as SettingTypes[typeof key]);
    }
    return returnValue as {
        [K in TSettingKey]: SettingManager<TSettings[K]>;
    };
}