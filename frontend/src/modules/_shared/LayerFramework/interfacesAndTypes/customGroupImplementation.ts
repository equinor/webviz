import { MakeSettingTypesMap, Settings } from "../settings/settingsDefinitions";

/**
 * This interface is describing what methods and members a custom group must implement.
 * A custom group can contain settings but it does not have to.
 */
export interface CustomGroupImplementation {
    /**
     * @returns The default name of a group of this type.
     */
    getDefaultName(): string;
}

export interface CustomGroupImplementationWithSettings<
    TSettings extends Settings = [],
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>
> extends CustomGroupImplementation {
    /**
     * The settings that this handler is using/providing.
     */
    settings: TSettings;

    /**
     * A method that returns the default values of the settings.
     * @returns The default values of the settings.
     */
    getDefaultSettingsValues(): TSettingTypes;
}

export function includesSettings(obj: any): obj is CustomGroupImplementationWithSettings {
    return obj.settings !== undefined && obj.getDefaultSettingsValues !== undefined;
}
