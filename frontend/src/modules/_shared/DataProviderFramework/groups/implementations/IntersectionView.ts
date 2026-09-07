import { getDrilledWellboreHeadersOptions, getPlannedWellboreHeadersOptions } from "@api";

import { Setting } from "../..//settings/settingsDefinitions";
import { getAvailableIntersectionOptions } from "../../dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import type { CustomGroupImplementationWithSettings } from "../../interfacesAndTypes/customGroupImplementation";
import type { SetupBasicBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";

const intersectionViewSettings = [Setting.INTERSECTION] as const;
export type IntersectionViewSettings = typeof intersectionViewSettings;
type SettingTypes = MakeSettingTypesMap<IntersectionViewSettings>;

export class IntersectionView implements CustomGroupImplementationWithSettings<IntersectionViewSettings> {
    settings = intersectionViewSettings;

    getDefaultName(): string {
        return "Intersection view";
    }

    setupBindings({
        setting,
        makeSharedResult,
        queryClient,
    }: SetupBasicBindingsContext<IntersectionViewSettings, SettingTypes>): void {
        const wellboreHeaders = makeSharedResult({
            debugName: "wellboreHeaders",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            async resolve({ fieldIdentifier }, { abortSignal }) {
                if (!fieldIdentifier) {
                    return null;
                }

                return await queryClient.fetchQuery({
                    ...getDrilledWellboreHeadersOptions({
                        query: { field_identifier: fieldIdentifier },
                        signal: abortSignal,
                    }),
                });
            },
        });

        const plannedWellboreHeaders = makeSharedResult({
            debugName: "plannedWellboreHeaders",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            async resolve({ fieldIdentifier }, { abortSignal }) {
                if (!fieldIdentifier) {
                    return null;
                }

                return await queryClient.fetchQuery({
                    ...getPlannedWellboreHeadersOptions({
                        query: { field_identifier: fieldIdentifier },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.INTERSECTION).bindValueConstraints({
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    intersectionPolylines: read.globalSetting("intersectionPolylines"),
                    wellboreHeaders: read.sharedResult(wellboreHeaders),
                    plannedWellboreHeaders: read.sharedResult(plannedWellboreHeaders),
                };
            },
            resolve({ fieldIdentifier, intersectionPolylines, wellboreHeaders, plannedWellboreHeaders }) {
                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
                );

                return getAvailableIntersectionOptions(
                    wellboreHeaders ?? [],
                    fieldIntersectionPolylines,
                    plannedWellboreHeaders ?? [],
                );
            },
        });
    }

    getDefaultSettingsValues() {
        return {
            intersection: null,
        };
    }
}
