import { isEqual } from "lodash";

import type { SurfaceRealizationSampleValues_api } from "@api";
import {
    SurfaceAttributeType_api,
    getRealizationSurfacesMetadataOptions,
    postGetSampleSurfaceInPointsOptions,
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
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
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

export class SurfacesPerRealizationValuesProvider implements CustomDataProviderImplementation<
    SurfacesPerRealizationValuesSettings,
    SurfacesPerRealizationValuesData,
    SurfacesPerRealizationValuesStoredData
> {
    settings = surfacesPerRealizationValuesSettings;

    getDefaultName() {
        return "Surfaces Per Realization Values";
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
            !isEqual(prevSettings.realizations, newSettings.realizations) ||
            !isEqual(prevSettings.attribute, newSettings.attribute) ||
            !isEqual(prevSettings.surfaceNames, newSettings.surfaceNames)
        );
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<
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
            getSetting(Setting.SURFACE_NAMES) !== null
        );
    }

    setupBindings({
        setting,
        storedData,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<SurfacesPerRealizationValuesSettings, SurfacesPerRealizationValuesStoredData>): void {
        setting(Setting.WELLBORE_EXTENSION_LENGTH).bindAttributes({
            read(read) {
                return { intersection: read.localSetting(Setting.INTERSECTION) };
            },
            resolve({ intersection }) {
                return { enabled: intersection?.type === IntersectionType.WELLBORE };
            },
        });

        setting(Setting.ENSEMBLE).bindValueConstraints({
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
            },
        });

        setting(Setting.REALIZATIONS).bindValueConstraints({
            read(read) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realizationFilterFunction: read.globalSetting("realizationFilterFunction"),
                };
            },
            resolve({ ensembleIdent, realizationFilterFunction }) {
                return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunction);
            },
        });

        const wellboreHeadersDep = makeSharedResult({
            debugName: "WellboreHeaders",
            read(read) {
                return { ensembleIdent: read.localSetting(Setting.ENSEMBLE) };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
                return fetchWellboreHeaders(ensembleIdent, abortSignal, workbenchSession, queryClient);
            },
        });

        setting(Setting.INTERSECTION).bindValueConstraints({
            read(read) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeadersDep),
                    intersectionPolylines: read.globalSetting("intersectionPolylines"),
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            resolve({ wellboreHeaders, intersectionPolylines, fieldIdentifier }) {
                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
                );
                return getAvailableIntersectionOptions(wellboreHeaders ?? [], fieldIntersectionPolylines);
            },
        });

        const surfaceMetadataSetDep = makeSharedResult({
            debugName: "SurfaceMetadata",
            read(read) {
                return { ensembleIdent: read.localSetting(Setting.ENSEMBLE) };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
                if (!ensembleIdent) {
                    return null;
                }

                return await queryClient.fetchQuery({
                    ...getRealizationSurfacesMetadataOptions({
                        query: {
                            case_uuid: ensembleIdent.getCaseUuid(),
                            ensemble_name: ensembleIdent.getEnsembleName(),
                            ...makeCacheBustingQueryParam(ensembleIdent),
                        },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.ATTRIBUTE).bindValueConstraints({
            read(read) {
                return { surfaceMetadataSet: read.sharedResult(surfaceMetadataSetDep) };
            },
            resolve({ surfaceMetadataSet }) {
                if (!surfaceMetadataSet) {
                    return [];
                }
                const depthSurfacesMetadata = surfaceMetadataSet.surfaces.filter(
                    (elm) => elm.attribute_type === SurfaceAttributeType_api.DEPTH,
                );
                return Array.from(new Set(depthSurfacesMetadata.map((elm) => elm.attribute_name))).sort();
            },
        });

        setting(Setting.SURFACE_NAMES).bindValueConstraints({
            read(read) {
                return {
                    attribute: read.localSetting(Setting.ATTRIBUTE),
                    surfaceMetadataSet: read.sharedResult(surfaceMetadataSetDep),
                };
            },
            resolve({ attribute, surfaceMetadataSet }) {
                if (!attribute || !surfaceMetadataSet) {
                    return [];
                }
                const depthSurfacesMetadata = surfaceMetadataSet.surfaces.filter(
                    (elm) => elm.attribute_type === SurfaceAttributeType_api.DEPTH,
                );
                const filteredSurfaceNames = Array.from(
                    new Set(
                        depthSurfacesMetadata.filter((elm) => elm.attribute_name === attribute).map((elm) => elm.name),
                    ),
                );
                return sortStringArray(filteredSurfaceNames, surfaceMetadataSet.surface_names_in_strat_order);
            },
        });

        // Create intersection polyline and actual section lengths data asynchronously
        const intersectionPolylineWithSectionLengthsDep = makeSharedResult({
            debugName: "IntersectionPolylineWithSectionLengths",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    intersection: read.localSetting(Setting.INTERSECTION),
                    wellboreExtensionLength: read.localSetting(Setting.WELLBORE_EXTENSION_LENGTH),
                };
            },
            async resolve({ fieldIdentifier, intersection, wellboreExtensionLength }, { abortSignal }) {
                return createIntersectionPolylineWithSectionLengthsForField(
                    fieldIdentifier,
                    intersection,
                    wellboreExtensionLength ?? 0,
                    workbenchSession,
                    queryClient,
                    abortSignal,
                );
            },
        });

        storedData("requestedPolylineWithCumulatedLengths").bindValue({
            read(read) {
                return {
                    intersectionPolylineWithSectionLengths: read.sharedResult(
                        intersectionPolylineWithSectionLengthsDep,
                    ),
                    intersection: read.localSetting(Setting.INTERSECTION),
                    wellboreExtensionLength: read.localSetting(Setting.WELLBORE_EXTENSION_LENGTH),
                };
            },
            resolve({ intersectionPolylineWithSectionLengths, intersection, wellboreExtensionLength }) {
                const extensionLength = createValidExtensionLength(intersection, wellboreExtensionLength);

                // Add hard coded sample resolution of 25 meters for now (should be derived from metadata in future)
                const sampleResolutionInMeters = 25.0;

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
            },
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        fetchQuery,
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

            return { surfaceName: surfaceName, fetchPromise: fetchQuery(queryOptions) };
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
