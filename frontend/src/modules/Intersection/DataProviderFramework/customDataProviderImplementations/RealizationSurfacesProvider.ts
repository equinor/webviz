import { isEqual } from "lodash";

import type { SurfaceIntersectionData_api } from "@api";
import {
    SurfaceAttributeType_api,
    getRealizationSurfacesMetadataOptions,
    postGetSurfaceIntersectionOptions,
} from "@api";
import { IntersectionType } from "@framework/types/intersection";
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
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";

import { createResampledPolylinePointsAndCumulatedLengthArray } from "./utils";

const realizationSurfacesSettings = [
    Setting.INTERSECTION,
    Setting.INTERSECTION_EXTENSION_LENGTH,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.SURFACE_NAMES,
    Setting.SAMPLE_RESOLUTION_IN_METERS,
    Setting.COLOR_SET,
] as const;
export type RealizationSurfacesSettings = typeof realizationSurfacesSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationSurfacesSettings>;

export type RealizationSurfacesStoredData = {
    polylineWithSectionLengths: PolylineWithSectionLengths;
};

export type RealizationSurfacesData = SurfaceIntersectionData_api[];

export class RealizationSurfacesProvider
    implements
        CustomDataProviderImplementation<
            RealizationSurfacesSettings,
            RealizationSurfacesData,
            RealizationSurfacesStoredData
        >
{
    settings = realizationSurfacesSettings;

    getDefaultName() {
        return "Realization Surfaces";
    }

    getDefaultSettingsValues() {
        return {
            [Setting.INTERSECTION_EXTENSION_LENGTH]: 500.0,
            [Setting.SAMPLE_RESOLUTION_IN_METERS]: 1.0,
        };
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<
        RealizationSurfacesSettings,
        RealizationSurfacesData,
        RealizationSurfacesStoredData
    >): boolean {
        // Extension has to be set if intersection is wellbore
        const isValidIntersectionExtensionLength =
            getSetting(Setting.INTERSECTION)?.type !== IntersectionType.WELLBORE ||
            getSetting(Setting.INTERSECTION_EXTENSION_LENGTH) !== null;

        return (
            getSetting(Setting.INTERSECTION) !== null &&
            isValidIntersectionExtensionLength &&
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.SURFACE_NAMES) !== null &&
            getSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
        workbenchSession,
        storedDataUpdater,
    }: DefineDependenciesArgs<RealizationSurfacesSettings, RealizationSurfacesStoredData>): void {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");
            return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
        });

        availableSettingsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");
            return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunc);
        });

        const wellboreHeadersDep = helperDependency(({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            return fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
        });

        availableSettingsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep) ?? [];
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");
            const fieldIdentifier = getGlobalSetting("fieldId");

            const fieldIntersectionPolylines = intersectionPolylines.filter(
                (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
            );

            return getAvailableIntersectionOptions(wellboreHeaders, fieldIntersectionPolylines);
        });

        const depthSurfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const surfaceMetadata = await queryClient.fetchQuery({
                ...getRealizationSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });

            const depthSurfacesMetadata = surfaceMetadata.surfaces.filter(
                (elm) => elm.attribute_type === SurfaceAttributeType_api.DEPTH,
            );
            return depthSurfacesMetadata;
        });

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const depthSurfacesMetadata = getHelperDependency(depthSurfaceMetadataDep);

            if (!depthSurfacesMetadata) {
                return [];
            }

            return Array.from(new Set(depthSurfacesMetadata.map((elm) => elm.attribute_name))).sort();
        });

        availableSettingsUpdater(Setting.SURFACE_NAMES, ({ getHelperDependency }) => {
            const depthSurfacesMetadata = getHelperDependency(depthSurfaceMetadataDep);

            if (!depthSurfacesMetadata) {
                return [];
            }

            return Array.from(new Set(depthSurfacesMetadata.map((elm) => elm.name))).sort();
        });

        // Create intersection polyline and actual section lengths data asynchronously
        const intersectionPolylineWithSectionLengthsDep = helperDependency(({ getLocalSetting, getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const intersection = getLocalSetting(Setting.INTERSECTION);
            const intersectionExtensionLength = getLocalSetting(Setting.INTERSECTION_EXTENSION_LENGTH) ?? 0;

            return createIntersectionPolylineWithSectionLengthsForField(
                fieldIdentifier,
                intersection,
                intersectionExtensionLength,
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
        registerQueryKey,
        queryClient,
    }: FetchDataParams<
        RealizationSurfacesSettings,
        RealizationSurfacesData,
        RealizationSurfacesStoredData
    >): Promise<RealizationSurfacesData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realization = getSetting(Setting.REALIZATION);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const surfaceNames = getSetting(Setting.SURFACE_NAMES);
        const sampleResolutionInMeters = getSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) ?? 1;
        const intersectionExtensionLength = getSetting(Setting.INTERSECTION_EXTENSION_LENGTH) ?? 0;

        if (sampleResolutionInMeters === null || !surfaceNames || !attribute) {
            throw new Error("Invalid settings: Sample resolution, surface names or attribute are not set");
        }

        const polylineWithSectionLengths = getStoredData("polylineWithSectionLengths");
        if (!polylineWithSectionLengths) {
            throw new Error("No polyline and actual section lengths found in stored data");
        }
        if (polylineWithSectionLengths.polylineUtmXy.length < 4) {
            throw new Error("Invalid polyline in stored data. Must contain at least two (x,y)-points");
        }

        const initialHorizontalPosition = -intersectionExtensionLength;
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
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        realization_num: realization ?? 0,
                        name: surfaceName,
                        attribute: attribute ?? "",
                    },
                    body: {
                        cumulative_length_polyline: {
                            x_points: resampledIntersectionPolyline.xPoints,
                            y_points: resampledIntersectionPolyline.yPoints,
                            cum_lengths: resampledIntersectionPolyline.cumulatedHorizontalPolylineLengthArr,
                        },
                    },
                });

                registerQueryKey(queryOptions.queryKey);

                return queryClient.fetchQuery(queryOptions);
            }),
        );

        return surfacesIntersectionPromises;
    }
}
