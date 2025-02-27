import { Setting, Settings } from "../../interfaces";
import { SettingRegistry } from "../../settings/SettingRegistry";
import { AllSettingTypes, SettingType } from "../../settings/settingsTypes";

export function makeSettings<TSettings extends Settings>(
    settings: TSettings
): { [K in keyof TSettings & keyof AllSettingTypes]: Setting<AllSettingTypes[K]> } {
    const returnValue: Record<string, unknown> = {} as Record<string, unknown>;
    for (const key in settings) {
        returnValue[key as SettingType] = SettingRegistry.makeSetting(key as SettingType) as Setting<
            AllSettingTypes[SettingType]
        >;
    }
    return returnValue as { [K in keyof TSettings & keyof AllSettingTypes]: Setting<AllSettingTypes[K]> };
}
