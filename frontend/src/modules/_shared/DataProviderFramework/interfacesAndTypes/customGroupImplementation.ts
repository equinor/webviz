import type { MakeSettingTypesMap, Settings } from "../settings/settingsDefinitions";

import type { DefineBasicDependenciesArgs } from "./customSettingsHandler";

/**
 * This interface is describing what methods and members a custom group must implement.
 * A custom group can contain settings but it does not have to.
 */
export interface CustomGroupImplementation {
    /**
     * @returns The default name of a group of this type.
     */
    getDefaultName(): string;

    /**
     * @returns The empty content message of a group of this type.
     */
    getEmptyContentMessage?(): string;
}

export interface CustomGroupImplementationWithSettings<
    TSettings extends Settings = [],
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
> extends CustomGroupImplementation {
    /**
     * The settings that this handler is using/providing.
     */
    settings: TSettings;

    /**
     * A method that returns the default values of the settings.
     * @returns The default values of the settings.
     */
    getDefaultSettingsValues?(): Partial<TSettingTypes>;

    defineDependencies?(args: DefineBasicDependenciesArgs<TSettings, TSettingTypes>): void;
}

export function includesSettings(obj: any): obj is CustomGroupImplementationWithSettings {
    return obj.settings !== undefined;
}
