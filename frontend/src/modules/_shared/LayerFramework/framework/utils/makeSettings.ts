
import { SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import { SettingRegistry } from "../../settings/SettingRegistry";
import { MakeSettingTypesMap, Settings, SettingTypes } from "../../settings/settingsDefinitions";
import { SettingManager } from "../SettingManager/SettingManager";


export function makeSettings<
    const TSettings extends Settings,
    const TSettingTypes extends MakeSettingTypesMap<TSettings>,
    const TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
>(
    settings: TSettings,
    defaultValues: Partial<TSettingTypes>
): { [K in TSettingKey]: SettingManager<K> } {
    const returnValue: Record<string, SettingManager<any>> = {} as Record<string, SettingManager<any>>;
    for (let i = 0; i < settings.length; i++) {
        const key = settings[i];
        returnValue[key] = SettingRegistry.makeSetting(key, defaultValues[key as keyof TSettingTypes] as SettingTypes[typeof key]);
    }
    return returnValue as {
        [K in TSettingKey]: SettingManager<K>;
    };
}