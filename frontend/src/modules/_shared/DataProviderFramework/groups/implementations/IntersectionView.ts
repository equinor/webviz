import { IntersectionType } from "@framework/types/intersection";

import { Setting } from "../..//settings/settingsDefinitions";
import type { CustomGroupImplementationWithSettings } from "../../interfacesAndTypes/customGroupImplementation";
import type { DefineBasicDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { getDrilledWellboreHeadersOptions } from "@api";
import { getAvailableIntersectionOptions } from "../../dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";

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
        helperDependency,
        valueRangeUpdater,
        queryClient,
    }: DefineBasicDependenciesArgs<IntersectionViewSettings, SettingTypes>): void {
        settingAttributesUpdater(Setting.WELLBORE_EXTENSION_LENGTH, ({ getLocalSetting }) => {
            const intersection = getLocalSetting(Setting.INTERSECTION);
            const enableExtensionLength = intersection?.type === IntersectionType.WELLBORE;

            return { enabled: enableExtensionLength };
        });

        const wellboreHeadersDep = helperDependency(async ({ getGlobalSetting, abortSignal }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");

            if (!fieldIdentifier) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier },
                    signal: abortSignal,
                }),
            });
        });

        valueRangeUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep) ?? [];
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");
            const fieldIdentifier = getGlobalSetting("fieldId");

            const fieldIntersectionPolylines = intersectionPolylines.filter(
                (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
            );

            return getAvailableIntersectionOptions(wellboreHeaders, fieldIntersectionPolylines);
        });
    }

    getDefaultSettingsValues() {
        return {
            intersection: null,
            wellboreExtensionLength: 500.0,
        };
    }
}
