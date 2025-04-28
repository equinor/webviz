import { getDrilledWellboreHeadersOptions, getSeismicCubeMetaListOptions, postGetSeismicFenceOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import type {
    PolylineIntersectionSpecification,
    WellboreIntersectionSpecification,
} from "@modules/_shared/Intersection/intersectionPolylineUtils";
import {
    createResampledPolylineWithSectionLengths,
    createResampledPolylineXyUtm,
    makeIntersectionPolylineWithSectionLengthsPromise,
} from "@modules/_shared/Intersection/intersectionPolylineUtils";
import type { SeismicFenceData_trans } from "@modules/_shared/Intersection/seismicIntersectionTransform";
import { transformSeismicFenceData } from "@modules/_shared/Intersection/seismicIntersectionTransform";
import { createSeismicFencePolylineFromPolylineXy } from "@modules/_shared/Intersection/seismicIntersectionUtils";

import { isEqual } from "lodash";

import type { MakeSettingTypesMap } from "../../../DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "../../../DataProviderFramework/settings/settingsDefinitions";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
import type { IntersectionSettingValue } from "../../settings/implementations/IntersectionSetting";

const intersectionRealizationSeismicSettings = [
    Setting.INTERSECTION,
    Setting.INTERSECTION_EXTENSION_LENGTH,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.TIME_OR_INTERVAL,
    Setting.SAMPLE_RESOLUTION_IN_METERS,
    Setting.COLOR_SCALE,
] as const;
export type IntersectionRealizationSeismicSettings = typeof intersectionRealizationSeismicSettings;
type SettingsWithTypes = MakeSettingTypesMap<IntersectionRealizationSeismicSettings>;

export type IntersectionRealizationSeismicStoredData = {
    sourcePolylineWithSectionLengths: PolylineWithSectionLengths;
    seismicFencePolylineUtmXy: number[];
    seismicFencePolylineWithSectionLengths: PolylineWithSectionLengths;
};

export enum SeismicDataSource {
    OBSERVED = "observed",
    SIMULATED = "simulated",
}

const SeismicDataSourceEnumToStringMapping = {
    [SeismicDataSource.OBSERVED]: "Observed",
    [SeismicDataSource.SIMULATED]: "Simulated",
};

export type IntersectionRealizationSeismicData = SeismicFenceData_trans;

export class IntersectionRealizationSeismicProvider
    implements
        CustomDataProviderImplementation<
            IntersectionRealizationSeismicSettings,
            IntersectionRealizationSeismicData,
            IntersectionRealizationSeismicStoredData
        >
{
    settings = intersectionRealizationSeismicSettings;

    private _dataSource: SeismicDataSource;

    constructor(dataSource: SeismicDataSource) {
        this._dataSource = dataSource;
    }

    getDefaultSettingsValues() {
        return {
            [Setting.SAMPLE_RESOLUTION_IN_METERS]: 1,
        };
    }

    getDefaultName(): string {
        const dataSourceString = SeismicDataSourceEnumToStringMapping[this._dataSource];
        return `Intersection Realization ${dataSourceString} Seismic`;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<
        IntersectionRealizationSeismicSettings,
        IntersectionRealizationSeismicData,
        IntersectionRealizationSeismicStoredData
    >): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }

        // TODO: Implement value range calculation
        return null;

        // TODO: Find min and max values in data
        // Should it be a part of data from back-end, for easier access?
        if (data) {
            // return [data.min_grid_prop_value, data.max_grid_prop_value];
            return [0, 1];
        }

        return null;
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<
        IntersectionRealizationSeismicSettings,
        IntersectionRealizationSeismicData,
        IntersectionRealizationSeismicStoredData
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
            getSetting(Setting.TIME_OR_INTERVAL) !== null &&
            getSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
        workbenchSession,
        storedDataUpdater,
    }: DefineDependenciesArgs<IntersectionRealizationSeismicSettings, IntersectionRealizationSeismicStoredData>): void {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);

            return [...realizations];
        });

        const ensembleSeismicCubeMetaListDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getSeismicCubeMetaListOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                    },

                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const seismicCubeMetaList = getHelperDependency(ensembleSeismicCubeMetaListDep);

            if (!seismicCubeMetaList) {
                return [];
            }

            // Get seismic attributes that are depth of correct data source
            const doRequestObservation = this._dataSource === SeismicDataSource.OBSERVED;
            const availableAttributes = Array.from(
                new Set(
                    seismicCubeMetaList
                        .filter((el) => el.isDepth && el.isObservation === doRequestObservation)
                        .map((el) => el.seismicAttribute),
                ),
            );

            return availableAttributes;
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

        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const seismicCubeMetaList = getHelperDependency(ensembleSeismicCubeMetaListDep);
            const seismicAttribute = getLocalSetting(Setting.ATTRIBUTE);

            if (!seismicAttribute || !seismicCubeMetaList) {
                return [];
            }

            const availableTimeOrIntervals = [
                ...Array.from(
                    new Set(
                        seismicCubeMetaList
                            .filter((surface) => surface.seismicAttribute === seismicAttribute)
                            .map((el) => el.isoDateOrInterval),
                    ),
                ),
            ];

            return availableTimeOrIntervals;
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

        storedDataUpdater("sourcePolylineWithSectionLengths", ({ getHelperDependency }) => {
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

        // TODO: Remove from storedData and use sourcePolylineWithSectionLengths in fetchData, and create resampled polyline there?
        storedDataUpdater("seismicFencePolylineUtmXy", ({ getHelperDependency, getLocalSetting }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );
            const sampleResolutionInMeters = getLocalSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) ?? 1;

            // If no intersection is selected, or polyline is empty, return an empty polyline
            if (
                !intersectionPolylineWithSectionLengths ||
                intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
            ) {
                return [];
            }

            // Resample the polyline, as seismic fence is created by one trace per (x,y) point in the polyline
            const resampledPolylineXyUtm = createResampledPolylineXyUtm(
                intersectionPolylineWithSectionLengths.polylineUtmXy,
                sampleResolutionInMeters,
            );
            return resampledPolylineXyUtm;
        });

        storedDataUpdater("seismicFencePolylineWithSectionLengths", ({ getHelperDependency, getLocalSetting }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );
            const sampleResolutionInMeters = getLocalSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) ?? 1;

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

            // Resample the polyline, as seismic fence is created by one trace per (x,y) point in the polyline
            const resampledPolylineWithSectionLengths = createResampledPolylineWithSectionLengths(
                intersectionPolylineWithSectionLengths,
                sampleResolutionInMeters,
            );

            return resampledPolylineWithSectionLengths;
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<
        IntersectionRealizationSeismicSettings,
        IntersectionRealizationSeismicData,
        IntersectionRealizationSeismicStoredData
    >): Promise<IntersectionRealizationSeismicData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realization = getSetting(Setting.REALIZATION);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const seismicFencePolylineUtmXy = getStoredData("seismicFencePolylineWithSectionLengths")?.polylineUtmXy;

        if (!seismicFencePolylineUtmXy) {
            throw new Error("No seismic fence polyline found in stored data");
        }
        if (seismicFencePolylineUtmXy.length === 0) {
            throw new Error("Invalid seismic fence polyline in stored data. Must contain at least two (x,y)-points");
        }

        const apiSeismicFencePolyline = createSeismicFencePolylineFromPolylineXy(seismicFencePolylineUtmXy);
        const queryOptions = postGetSeismicFenceOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realization ?? 0,
                seismic_attribute: attribute ?? "",
                time_or_interval_str: timeOrInterval ?? "",
                observed: this._dataSource === SeismicDataSource.OBSERVED,
            },
            body: {
                polyline: apiSeismicFencePolyline,
            },
        });

        registerQueryKey(queryOptions.queryKey);

        const seismicFenceDataPromise = queryClient.fetchQuery(queryOptions).then(transformSeismicFenceData);

        return seismicFenceDataPromise;
    }
}
