import { isEqual } from "lodash";

import type { SurfaceIntersectionData_api } from "@api";
import {
    SurfaceAttributeType_api,
    getRealizationSurfacesMetadataOptions,
    postGetSurfaceIntersectionOptions,
} from "@api";
import { IntersectionType } from "@framework/types/intersection";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { sortStringArray } from "@lib/utils/arrays";
import { assertNonNull } from "@lib/utils/assertNonNull";
import {
    createIntersectionPolylineWithSectionLengthsForField,
    fetchWellboreHeaders,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedHelperDependencyFunctions";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableIntersectionOptions,
    getAvailableRealizationsForEnsembleIdent,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";

import { createValidExtensionLength } from "../utils/extensionLengthUtils";

import { createResampledPolylinePointsAndCumulatedLengthArray } from "./utils";

const realizationSurfacesSettings = [
    Setting.INTERSECTION,
    Setting.WELLBORE_EXTENSION_LENGTH,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.SURFACE_NAMES,
    Setting.COLOR_SET,
] as const;
export type RealizationSurfacesSettings = typeof realizationSurfacesSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationSurfacesSettings>;

export type RealizationSurfacesStoredData = {
    polylineWithSectionLengths: PolylineWithSectionLengths;
};

export type RealizationSurfacesData = SurfaceIntersectionData_api[];

export class RealizationSurfacesProvider implements CustomDataProviderImplementation<
    RealizationSurfacesSettings,
    RealizationSurfacesData,
    RealizationSurfacesStoredData
> {
    settings = realizationSurfacesSettings;

    getDefaultName() {
        return "Realization Surfaces";
    }

    getDefaultSettingsValues() {
        return {
            [Setting.WELLBORE_EXTENSION_LENGTH]: 500.0,
        };
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return (
            !prevSettings ||
            !isEqual(prevSettings.intersection, newSettings.intersection) ||
            !isEqual(prevSettings.wellboreExtensionLength, newSettings.wellboreExtensionLength) ||
            !isEqual(prevSettings.ensemble, newSettings.ensemble) ||
            !isEqual(prevSettings.realization, newSettings.realization) ||
            !isEqual(prevSettings.attribute, newSettings.attribute) ||
            !isEqual(prevSettings.surfaceNames, newSettings.surfaceNames)
        );
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<
        RealizationSurfacesSettings,
        RealizationSurfacesData,
        RealizationSurfacesStoredData
    >): boolean {
        // Extension has to be set if intersection is wellbore
        const isValidExtensionLength =
            getSetting(Setting.INTERSECTION)?.type !== IntersectionType.WELLBORE ||
            getSetting(Setting.WELLBORE_EXTENSION_LENGTH) !== null;

        return (
            getSetting(Setting.INTERSECTION) !== null &&
            isValidExtensionLength &&
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.SURFACE_NAMES) !== null
        );
    }

    defineDependencies({
        helperDependency,
        valueConstraintsUpdater,
        settingAttributesUpdater,
        queryClient,
        workbenchSession,
        storedDataUpdater,
    }: DefineDependenciesArgs<RealizationSurfacesSettings, RealizationSurfacesStoredData>): void {
        settingAttributesUpdater(Setting.WELLBORE_EXTENSION_LENGTH, ({ getLocalSetting }) => {
            const intersection = getLocalSetting(Setting.INTERSECTION);

            const isEnabled = intersection?.type === IntersectionType.WELLBORE;
            return { enabled: isEnabled };
        });

        valueConstraintsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");
            return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
        });

        valueConstraintsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");
            return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunc);
        });

        const wellboreHeadersDep = helperDependency(({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            return fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
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

        const surfaceMetadataSetDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const surfaceMetadata = await queryClient.fetchQuery({
                ...getRealizationSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                        ...makeCacheBustingQueryParam(ensembleIdent),
                    },
                    signal: abortSignal,
                }),
            });

            return surfaceMetadata;
        });

        valueConstraintsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const surfaceMetadataSet = getHelperDependency(surfaceMetadataSetDep);
            if (!surfaceMetadataSet) {
                return [];
            }
            const depthSurfacesMetadata = surfaceMetadataSet.surfaces.filter(
                (elm) => elm.attribute_type === SurfaceAttributeType_api.DEPTH,
            );
            if (!depthSurfacesMetadata) {
                return [];
            }

            return Array.from(new Set(depthSurfacesMetadata.map((elm) => elm.attribute_name))).sort();
        });

        valueConstraintsUpdater(Setting.SURFACE_NAMES, ({ getLocalSetting, getHelperDependency }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const surfaceMetadataSet = getHelperDependency(surfaceMetadataSetDep);

            if (!attribute || !surfaceMetadataSet) {
                return [];
            }
            const depthSurfacesMetadata = surfaceMetadataSet.surfaces.filter(
                (elm) => elm.attribute_type === SurfaceAttributeType_api.DEPTH,
            );

            const filteredSurfaceNames = Array.from(
                new Set(depthSurfacesMetadata.filter((elm) => elm.attribute_name === attribute).map((elm) => elm.name)),
            );
            return sortStringArray(filteredSurfaceNames, surfaceMetadataSet.surface_names_in_strat_order);
        });

        // Create intersection polyline and actual section lengths data asynchronously
        const intersectionPolylineWithSectionLengthsDep = helperDependency(({ getLocalSetting, getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const intersection = getLocalSetting(Setting.INTERSECTION);
            const wellboreExtensionLength = getLocalSetting(Setting.WELLBORE_EXTENSION_LENGTH) ?? 0;

            return createIntersectionPolylineWithSectionLengthsForField(
                fieldIdentifier,
                intersection,
                wellboreExtensionLength,
                workbenchSession,
                queryClient,
            );
        });

        storedDataUpdater("polylineWithSectionLengths", ({ getHelperDependency }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );

            // If no intersection is selected, or polyline is empty, return an empty polyline
            if (
                !intersectionPolylineWithSectionLengths ||
                intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
            ) {
                return {
                    polylineUtmXy: [],
                    actualSectionLengths: [],
                };
            }

            return intersectionPolylineWithSectionLengths;
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        fetchQuery,
    }: FetchDataParams<
        RealizationSurfacesSettings,
        RealizationSurfacesData,
        RealizationSurfacesStoredData
    >): Promise<RealizationSurfacesData> {
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const realization = assertNonNull(getSetting(Setting.REALIZATION), "No realization number selected");
        const attribute = assertNonNull(getSetting(Setting.ATTRIBUTE), "No attribute selected");
        const surfaceNames = assertNonNull(getSetting(Setting.SURFACE_NAMES), "No surface names selected");
        const polylineWithSectionLengths = assertNonNull(
            getStoredData("polylineWithSectionLengths"),
            "No polyline and actual section lengths found in stored data",
        );
        const extensionLength = createValidExtensionLength(
            getSetting(Setting.INTERSECTION),
            getSetting(Setting.WELLBORE_EXTENSION_LENGTH),
        );

        if (polylineWithSectionLengths.polylineUtmXy.length < 4) {
            throw new Error("Invalid polyline in stored data. Must contain at least two (x,y)-points");
        }

        // Add hard coded sample resolution of 25 meters for now (should be derived from metadata in future)
        const sampleResolutionInMeters = 25.0;

        const initialHorizontalPosition = -extensionLength;
        const resampledIntersectionPolyline = createResampledPolylinePointsAndCumulatedLengthArray(
            polylineWithSectionLengths.polylineUtmXy,
            polylineWithSectionLengths.actualSectionLengths,
            initialHorizontalPosition,
            sampleResolutionInMeters,
        );

        const surfacesIntersectionPromises = Promise.all(
            surfaceNames.map((surfaceName) => {
                const queryOptions = postGetSurfaceIntersectionOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                        realization_num: realization,
                        name: surfaceName,
                        attribute: attribute,
                    },
                    body: {
                        cumulative_length_polyline: {
                            x_points: resampledIntersectionPolyline.xPoints,
                            y_points: resampledIntersectionPolyline.yPoints,
                            cum_lengths: resampledIntersectionPolyline.cumulatedHorizontalPolylineLengthArr,
                        },
                    },
                });

                return fetchQuery(queryOptions);
            }),
        );

        return surfacesIntersectionPromises;
    }
}
