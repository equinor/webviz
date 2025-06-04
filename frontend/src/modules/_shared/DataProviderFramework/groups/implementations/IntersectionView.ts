import { IntersectionType } from "@framework/types/intersection";

import type { MakeSettingTypesMap } from "../..//settings/settingsDefinitions";
import { Setting } from "../..//settings/settingsDefinitions";
import type { CustomGroupImplementationWithSettings } from "../../interfacesAndTypes/customGroupImplementation";
import type { DefineBasicDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";

const intersectionViewSettings = [Setting.INTERSECTION, Setting.WELLBORE_EXTENSION_LENGTH] as const;
export type IntersectionViewSettings = typeof intersectionViewSettings;
type SettingTypes = MakeSettingTypesMap<IntersectionViewSettings>;

export class IntersectionView implements CustomGroupImplementationWithSettings<IntersectionViewSettings> {
    settings = intersectionViewSettings;

    getDefaultName(): string {
        return "Intersection view";
    }

    defineDependencies({
        settingAttributesUpdater,
    }: DefineBasicDependenciesArgs<IntersectionViewSettings, SettingTypes>): void {
        settingAttributesUpdater(Setting.WELLBORE_EXTENSION_LENGTH, ({ getLocalSetting }) => {
            const intersection = getLocalSetting(Setting.INTERSECTION);
            const enableExtensionLength = intersection?.type === IntersectionType.WELLBORE;

            return { enabled: enableExtensionLength };
        });
    }

    getDefaultSettingsValues() {
        return {
            intersection: null,
            wellboreExtensionLength: 500.0,
        };
    }
}
