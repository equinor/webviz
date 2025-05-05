import { isEqual } from "lodash";

import { getSeismicCubeMetaListOptions, postGetSeismicFenceOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import { createSectionWiseResampledPolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineUtils";
import type { SeismicFenceData_trans } from "@modules/_shared/Intersection/seismicIntersectionTransform";
import { transformSeismicFenceData } from "@modules/_shared/Intersection/seismicIntersectionTransform";
import { createSeismicFencePolylineFromPolylineXy } from "@modules/_shared/Intersection/seismicIntersectionUtils";

import type { MakeSettingTypesMap } from "../../../DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "../../../DataProviderFramework/settings/settingsDefinitions";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import { CancelUpdate, type DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
import {
    createIntersectionPolylineWithSectionLengthsForField,
    fetchWellboreHeaders,
} from "../dependencyFunctions/sharedHelperDependencyFunctions";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableIntersectionOptions,
    getAvailableRealizationsForEnsembleIdent,
} from "../dependencyFunctions/sharedSettingUpdaterFunctions";

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
            [Setting.INTERSECTION_EXTENSION_LENGTH]: 500.0,
            [Setting.SAMPLE_RESOLUTION_IN_METERS]: 1.0,
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

        if (data) {
            const minValue = data.fenceTracesFloat32Arr.reduce((acc, value) => Math.min(acc, value), Infinity);
            const maxValue = data.fenceTracesFloat32Arr.reduce((acc, value) => Math.max(acc, value), -Infinity);
            return [minValue, maxValue];
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
            return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
        });

        availableSettingsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");
            return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunc);
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
            ).sort();

            return availableAttributes;
        });

        const wellboreHeadersDep = helperDependency(({ getLocalSetting, abortSignal }) =>
            fetchWellboreHeaders(getLocalSetting(Setting.ENSEMBLE), abortSignal, workbenchSession, queryClient),
        );

        availableSettingsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep) ?? [];
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");

            return getAvailableIntersectionOptions(wellboreHeaders, intersectionPolylines);
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
                ).sort(),
            ];

            return availableTimeOrIntervals;
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

        storedDataUpdater("sourcePolylineWithSectionLengths", ({ getHelperDependency }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );

            // If no intersection is selected, or polyline is empty, cancel update
            if (
                !intersectionPolylineWithSectionLengths ||
                intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
            ) {
                return CancelUpdate;
            }

            return intersectionPolylineWithSectionLengths;
        });

        storedDataUpdater("seismicFencePolylineWithSectionLengths", ({ getHelperDependency, getLocalSetting }) => {
            const intersectionPolylineWithSectionLengths = getHelperDependency(
                intersectionPolylineWithSectionLengthsDep,
            );
            const sampleResolutionInMeters = getLocalSetting(Setting.SAMPLE_RESOLUTION_IN_METERS) ?? 1;

            // If no intersection is selected, or polyline is empty, cancel update
            if (
                !intersectionPolylineWithSectionLengths ||
                intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
            ) {
                return CancelUpdate;
            }

            // Resample the polyline, as seismic fence is created by one trace per (x,y) point in the polyline
            const resampledPolylineWithSectionLengths = createSectionWiseResampledPolylineWithSectionLengths(
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
        if (seismicFencePolylineUtmXy.length < 4) {
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
