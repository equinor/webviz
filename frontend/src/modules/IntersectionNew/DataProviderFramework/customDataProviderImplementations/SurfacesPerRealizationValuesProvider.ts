import type { SurfaceRealizationSampleValues_api } from "@api";
import {
    SurfaceAttributeType_api,
    getDrilledWellboreHeadersOptions,
    getRealizationSurfacesMetadataOptions,
    postGetSampleSurfaceInPointsOptions,
} from "@api";
import { IntersectionType } from "@framework/types/intersection";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import type {
    PolylineIntersectionSpecification,
    WellboreIntersectionSpecification,
} from "@modules/_shared/Intersection/intersectionPolylineUtils";
import { makeIntersectionPolylineWithSectionLengthsPromise } from "@modules/_shared/Intersection/intersectionPolylineUtils";

import { isEqual } from "lodash";

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

            const ensembleIdentsForField = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdentsForField;
        });

        availableSettingsUpdater(Setting.REALIZATIONS, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);
            return [...realizations];
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const fieldIdentifier = ensemble.getFieldIdentifier();

            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");

            const intersectionOptions: IntersectionSettingValue[] = [];

            if (wellboreHeaders) {
                for (const wellboreHeader of wellboreHeaders) {
                    intersectionOptions.push({
                        type: IntersectionType.WELLBORE,
                        name: wellboreHeader.uniqueWellboreIdentifier,
                        uuid: wellboreHeader.wellboreUuid,
                    });
                }
            }

            for (const polyline of intersectionPolylines) {
                intersectionOptions.push({
                    type: IntersectionType.CUSTOM_POLYLINE,
                    name: polyline.name,
                    uuid: polyline.id,
                });
            }

            return intersectionOptions;
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

            return Array.from(new Set(depthSurfacesMetadata.map((elm) => elm.attribute_name)));
        });

        availableSettingsUpdater(Setting.SURFACE_NAMES, ({ getHelperDependency }) => {
            const depthSurfacesMetadata = getHelperDependency(depthSurfaceMetadataDep);

            if (!depthSurfacesMetadata) {
                return [];
            }

            return Array.from(new Set(depthSurfacesMetadata.map((elm) => elm.name)));
        });

        // Create intersection polyline and actual section lengths data asynchronously
        const intersectionPolylineWithSectionLengthsDep = helperDependency(
            async ({ getLocalSetting, getGlobalSetting }) => {
                const fieldIdentifier = getGlobalSetting("fieldId");
                const intersection = getLocalSetting(Setting.INTERSECTION);
                const intersectionExtensionLength = getLocalSetting(Setting.INTERSECTION_EXTENSION_LENGTH) ?? 0;

                // If no intersection is selected, return an empty polyline
                if (!intersection) {
                    const emptyPolylineWithSectionLengthsPromise = new Promise<PolylineWithSectionLengths>((resolve) =>
                        resolve({
                            polylineUtmXy: [],
                            actualSectionLengths: [],
                        }),
                    );

                    return emptyPolylineWithSectionLengthsPromise;
                }

                if (intersection.type === IntersectionType.CUSTOM_POLYLINE) {
                    const polyline = workbenchSession
                        .getUserCreatedItems()
                        .getIntersectionPolylines()
                        .getPolyline(intersection.uuid);
                    if (!polyline) {
                        throw new Error(`Could not find polyline with id ${intersection.uuid}`);
                    }
                    const intersectionSpecification: PolylineIntersectionSpecification = {
                        type: IntersectionType.CUSTOM_POLYLINE,
                        polyline: polyline,
                    };
                    return makeIntersectionPolylineWithSectionLengthsPromise(intersectionSpecification);
                }
                if (intersection.type === IntersectionType.WELLBORE) {
                    if (!fieldIdentifier) {
                        throw new Error("Field identifier is not set");
                    }

                    const intersectionSpecification: WellboreIntersectionSpecification = {
                        type: IntersectionType.WELLBORE,
                        wellboreUuid: intersection.uuid,
                        intersectionExtensionLength: intersectionExtensionLength,
                        fieldIdentifier: fieldIdentifier,
                        queryClient,
                    };
                    return makeIntersectionPolylineWithSectionLengthsPromise(intersectionSpecification);
                }

                throw new Error(`Unhandled intersection type ${intersection.type}`);
            },
        );

        storedDataUpdater("requestedPolylineWithCumulatedLengths", ({ getHelperDependency, getLocalSetting }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );
            const intersectionExtensionLength = getLocalSetting(Setting.INTERSECTION_EXTENSION_LENGTH) ?? 0;
            const sampleResolutionInMeters = getLocalSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) ?? 1;

            // If no intersection is selected, or polyline is empty, return an empty polyline
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
        if (
            requestedPolylineWithCumulatedLengths.xUtmPoints.length < 2 &&
            requestedPolylineWithCumulatedLengths.xUtmPoints.length !==
                requestedPolylineWithCumulatedLengths.yUtmPoints.length &&
            requestedPolylineWithCumulatedLengths.xUtmPoints.length !==
                requestedPolylineWithCumulatedLengths.cumulatedHorizontalPolylineLengthArr.length + 1
        ) {
            throw new Error(
                "Invalid polyline in stored data. Must contain at least two (x,y)-points, and cumulated length per polyline section",
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
