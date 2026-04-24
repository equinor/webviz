import { getDrilledWellboreHeadersOptions } from "@api";

import { Setting } from "../..//settings/settingsDefinitions";
import { getAvailableIntersectionOptions } from "../../dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import type { CustomGroupImplementationWithSettings } from "../../interfacesAndTypes/customGroupImplementation";
import type { DefineBasicDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";

const intersectionViewSettings = [Setting.INTERSECTION] as const;
export type IntersectionViewSettings = typeof intersectionViewSettings;
type SettingTypes = MakeSettingTypesMap<IntersectionViewSettings>;

export class IntersectionView implements CustomGroupImplementationWithSettings<IntersectionViewSettings> {
    settings = intersectionViewSettings;

    getDefaultName(): string {
        return "Intersection view";
    }

    defineDependencies({
        helperDependency,
        valueConstraintsUpdater,
        queryClient,
    }: DefineBasicDependenciesArgs<IntersectionViewSettings, SettingTypes>): void {
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

        valueConstraintsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
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
        };
    }
}
