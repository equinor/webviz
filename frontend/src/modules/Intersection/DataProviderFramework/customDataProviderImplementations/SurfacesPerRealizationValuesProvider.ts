import { isEqual } from "lodash";

import type { SurfaceRealizationSampleValues_api } from "@api";
import {
    SurfaceAttributeType_api,
    getRealizationSurfacesMetadataOptions,
    postGetSampleSurfaceInPointsOptions,
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
import {
    CancelUpdate,
    type DefineDependenciesArgs,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { createResampledPolylinePointsAndCumulatedLengthArray } from "./utils";

const surfacesPerRealizationValuesSettings = [
    Setting.INTERSECTION,
    Setting.INTERSECTION_EXTENSION_LENGTH,
    Setting.ENSEMBLE,
    Setting.REALIZATIONS,
    Setting.ATTRIBUTE,
    Setting.SURFACE_NAMES,
    Setting.SAMPLE_RESOLUTION_IN_METERS,
    Setting.COLOR_SET,
] as const;
export type SurfacesPerRealizationValuesSettings = typeof surfacesPerRealizationValuesSettings;
type SettingsWithTypes = MakeSettingTypesMap<SurfacesPerRealizationValuesSettings>;

export type SurfacesPerRealizationValuesStoredData = {
    requestedPolylineWithCumulatedLengths: {
        xUtmPoints: number[];
        yUtmPoints: number[];
        cumulatedHorizontalPolylineLengthArr: number[];
    };
};

// Key is surface name, value is surface sample values per selected realization
export type SurfacesPerRealizationValuesData = Record<string, SurfaceRealizationSampleValues_api[]>;

export class SurfacesPerRealizationValuesProvider
    implements
        CustomDataProviderImplementation<
            SurfacesPerRealizationValuesSettings,
            SurfacesPerRealizationValuesData,
            SurfacesPerRealizationValuesStoredData
        >
{
    settings = surfacesPerRealizationValuesSettings;

    getDefaultName() {
        return "Surfaces Per Realization Values";
    }

    getDefaultSettingsValues() {
        return {
            [Setting.INTERSECTION_EXTENSION_LENGTH]: 500.0,
            [Setting.SAMPLE_RESOLUTION_IN_METERS]: 1,
        };
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<
        SurfacesPerRealizationValuesSettings,
        SurfacesPerRealizationValuesData,
        SurfacesPerRealizationValuesStoredData
    >): boolean {
        // Extension has to be set if intersection is wellbore
        const isValidIntersectionExtensionLength =
            getSetting(Setting.INTERSECTION)?.type !== IntersectionType.WELLBORE ||
            getSetting(Setting.INTERSECTION_EXTENSION_LENGTH) !== null;

        return (
            getSetting(Setting.INTERSECTION) !== null &&
            isValidIntersectionExtensionLength &&
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATIONS) !== null &&
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
    }: DefineDependenciesArgs<SurfacesPerRealizationValuesSettings, SurfacesPerRealizationValuesStoredData>): void {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");
            return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
        });

        availableSettingsUpdater(Setting.REALIZATIONS, ({ getLocalSetting, getGlobalSetting }) => {
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

            return getAvailableIntersectionOptions(wellboreHeaders, intersectionPolylines);
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

        storedDataUpdater("requestedPolylineWithCumulatedLengths", ({ getHelperDependency, getLocalSetting }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );
            const intersectionExtensionLength = getLocalSetting(Setting.INTERSECTION_EXTENSION_LENGTH) ?? 0;
            const sampleResolutionInMeters = getLocalSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) ?? 1;

            // If no intersection is selected, or polyline is empty, cancel update
            if (
                !intersectionPolylineWithSectionLengths ||
                intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
            ) {
                return CancelUpdate;
            }

            const initialHorizontalPosition = -intersectionExtensionLength;
            const resampledPolylineWithCumulatedLengths = createResampledPolylinePointsAndCumulatedLengthArray(
                intersectionPolylineWithSectionLengths.polylineUtmXy,
                intersectionPolylineWithSectionLengths.actualSectionLengths,
                initialHorizontalPosition,
                sampleResolutionInMeters,
            );

            return {
                xUtmPoints: resampledPolylineWithCumulatedLengths.xPoints,
                yUtmPoints: resampledPolylineWithCumulatedLengths.yPoints,
                cumulatedHorizontalPolylineLengthArr:
                    resampledPolylineWithCumulatedLengths.cumulatedHorizontalPolylineLengthArr,
            };
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<
        SurfacesPerRealizationValuesSettings,
        SurfacesPerRealizationValuesData,
        SurfacesPerRealizationValuesStoredData
    >): Promise<SurfacesPerRealizationValuesData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizations = getSetting(Setting.REALIZATIONS);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const surfaceNames = getSetting(Setting.SURFACE_NAMES);

        if (!surfaceNames || !attribute) {
            throw new Error("Invalid settings: Sample resolution, surface names or attribute are not set");
        }

        const requestedPolylineWithCumulatedLengths = getStoredData("requestedPolylineWithCumulatedLengths");
        if (!requestedPolylineWithCumulatedLengths) {
            throw new Error("No polyline and cumulated lengths found in stored data");
        }
        if (requestedPolylineWithCumulatedLengths.xUtmPoints.length < 2) {
            throw new Error(
                "Invalid polyline in stored data. Must contain at least two (x,y)-points, and cumulated length per polyline section",
            );
        }
        if (
            requestedPolylineWithCumulatedLengths.xUtmPoints.length !==
            requestedPolylineWithCumulatedLengths.yUtmPoints.length
        ) {
            throw new Error("Invalid polyline points in stored data. Must have same number of X and Y points");
        }
        if (
            requestedPolylineWithCumulatedLengths.xUtmPoints.length !==
            requestedPolylineWithCumulatedLengths.cumulatedHorizontalPolylineLengthArr.length
        ) {
            throw new Error(
                "Invalid polyline in stored data. Number of cumulated lengths must be equal to number of polyline points",
            );
        }

        // Create list of surface name and its fetch promise
        const surfaceNameAndFetchList = surfaceNames.map((surfaceName) => {
            const queryOptions = postGetSampleSurfaceInPointsOptions({
                query: {
                    case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                    ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                    surface_name: surfaceName,
                    surface_attribute: attribute ?? "",
                    realization_nums: realizations ?? [],
                },
                body: {
                    sample_points: {
                        x_points: requestedPolylineWithCumulatedLengths.xUtmPoints,
                        y_points: requestedPolylineWithCumulatedLengths.yUtmPoints,
                    },
                },
            });

            registerQueryKey(queryOptions.queryKey);

            return { surfaceName: surfaceName, fetchPromise: queryClient.fetchQuery(queryOptions) };
        });

        // Assemble into one promise
        const promise = Promise.all(surfaceNameAndFetchList.map((elm) => elm.fetchPromise)).then((fetchResults) =>
            fetchResults.reduce<SurfacesPerRealizationValuesData>((acc, surfaceRealizationSampleValuesArray, i) => {
                acc[surfaceNameAndFetchList[i].surfaceName] = surfaceRealizationSampleValuesArray;
                return acc;
            }, {}),
        );

        return promise;
    }
}
