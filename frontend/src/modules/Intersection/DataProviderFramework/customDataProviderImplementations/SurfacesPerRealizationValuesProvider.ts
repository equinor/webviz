import { isEqual } from "lodash";

import type { SurfaceRealizationSampleValues_api } from "@api";
import {
    SurfaceAttributeType_api,
    getRealizationSurfacesMetadataOptions,
    postGetSampleSurfaceInPointsOptions,
} from "@api";
import { IntersectionType } from "@framework/types/intersection";
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
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { createValidExtensionLength } from "../utils/extensionLengthUtils";

import { createResampledPolylinePointsAndCumulatedLengthArray } from "./utils";

const surfacesPerRealizationValuesSettings = [
    Setting.INTERSECTION,
    Setting.WELLBORE_EXTENSION_LENGTH,
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
            [Setting.WELLBORE_EXTENSION_LENGTH]: 500.0,
            [Setting.SAMPLE_RESOLUTION_IN_METERS]: 1,
        };
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return (
            !prevSettings ||
            !isEqual(prevSettings.intersection, newSettings.intersection) ||
            !isEqual(prevSettings.wellboreExtensionLength, newSettings.wellboreExtensionLength) ||
            !isEqual(prevSettings.ensemble, newSettings.ensemble) ||
            !isEqual(prevSettings.realizations, newSettings.realizations) ||
            !isEqual(prevSettings.attribute, newSettings.attribute) ||
            !isEqual(prevSettings.surfaceNames, newSettings.surfaceNames) ||
            !isEqual(prevSettings.sampleResolutionInMeters, newSettings.sampleResolutionInMeters)
        );
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<
        SurfacesPerRealizationValuesSettings,
        SurfacesPerRealizationValuesData,
        SurfacesPerRealizationValuesStoredData
    >): boolean {
        // Extension has to be set if intersection is wellbore
        const isValidExtensionLength =
            getSetting(Setting.INTERSECTION)?.type !== IntersectionType.WELLBORE ||
            getSetting(Setting.WELLBORE_EXTENSION_LENGTH) !== null;

        return (
            getSetting(Setting.INTERSECTION) !== null &&
            isValidExtensionLength &&
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
        settingAttributesUpdater,
        queryClient,
        workbenchSession,
        storedDataUpdater,
    }: DefineDependenciesArgs<SurfacesPerRealizationValuesSettings, SurfacesPerRealizationValuesStoredData>): void {
        settingAttributesUpdater(Setting.WELLBORE_EXTENSION_LENGTH, ({ getLocalSetting }) => {
            const intersection = getLocalSetting(Setting.INTERSECTION);

            const isEnabled = intersection?.type === IntersectionType.WELLBORE;
            return { enabled: isEnabled };
        });

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

        availableSettingsUpdater(Setting.SURFACE_NAMES, ({ getLocalSetting, getHelperDependency }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const depthSurfacesMetadata = getHelperDependency(depthSurfaceMetadataDep);

            if (!attribute || !depthSurfacesMetadata) {
                return [];
            }

            // Filter depth surfaces metadata by the selected attribute
            return Array.from(
                new Set(depthSurfacesMetadata.filter((elm) => elm.attribute_name === attribute).map((elm) => elm.name)),
            ).sort();
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

        storedDataUpdater("requestedPolylineWithCumulatedLengths", ({ getHelperDependency, getLocalSetting }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );
            const sampleResolutionInMeters = getLocalSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) ?? 1;
            const extensionLength = createValidExtensionLength(
                getLocalSetting(Setting.INTERSECTION),
                getLocalSetting(Setting.WELLBORE_EXTENSION_LENGTH),
            );

            // If no intersection is selected, or polyline is empty, cancel update
            if (
                !intersectionPolylineWithSectionLengths ||
                intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
            ) {
                return {
                    xUtmPoints: [],
                    yUtmPoints: [],
                    cumulatedHorizontalPolylineLengthArr: [],
                };
            }

            const initialHorizontalPosition = -extensionLength;
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
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const realizations = getSetting(Setting.REALIZATIONS);
        const attribute = assertNonNull(getSetting(Setting.ATTRIBUTE), "No attribute selected");
        const surfaceNames = assertNonNull(getSetting(Setting.SURFACE_NAMES), "No surface names selected");
        const requestedPolylineWithCumulatedLengths = assertNonNull(
            getStoredData("requestedPolylineWithCumulatedLengths"),
            "No polyline and cumulated lengths found in stored data",
        );

        if (requestedPolylineWithCumulatedLengths.xUtmPoints.length < 2) {
            throw new Error(
                "Invalid polyline in stored data. Must contain at least two (x,y)-points, and cumulated length per polyline section",
            );
        }

        // Create list of surface name and its fetch promise
        const surfaceNameAndFetchList = surfaceNames.map((surfaceName) => {
            const queryOptions = postGetSampleSurfaceInPointsOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    surface_name: surfaceName,
                    surface_attribute: attribute,
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
