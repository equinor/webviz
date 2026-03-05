import { getDrilledWellboreHeadersOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";

import { Setting } from "../..//settings/settingsDefinitions";
import { getAvailableIntersectionOptions } from "../../dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import type { CustomGroupImplementationWithSettings } from "../../interfacesAndTypes/customGroupImplementation";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { SetupBasicBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import { intersection } from "lodash";

const intersectionViewSettings = [Setting.INTERSECTION, Setting.WELLBORE_EXTENSION_LENGTH] as const;
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
        setting(Setting.WELLBORE_EXTENSION_LENGTH).bindAttributes({
            read({ read }) {
                return {
                    intersection: read.localSetting(Setting.INTERSECTION),
                };
            },
            resolve({ intersection }) {
                const enableExtensionLength = intersection?.type === IntersectionType.WELLBORE;
                return { enabled: enableExtensionLength };
            },
        });

        const wellboreHeaders = makeSharedResult({
            debugName: "wellboreHeaders",
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            async resolve({ fieldIdentifier }, abortSignal) {
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

        setting(Setting.INTERSECTION).bindValueConstraints({
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    intersectionPolylines: read.globalSetting("intersectionPolylines"),
                    wellboreHeaders: read.sharedResult(wellboreHeaders),
                };
            },
            resolve({ fieldIdentifier, intersectionPolylines, wellboreHeaders }) {
                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
                );

                return getAvailableIntersectionOptions(wellboreHeaders ?? [], fieldIntersectionPolylines);
            },
        });
    }

    getDefaultSettingsValues() {
        return {
            intersection: null,
            wellboreExtensionLength: 500.0,
        };
    }
}
