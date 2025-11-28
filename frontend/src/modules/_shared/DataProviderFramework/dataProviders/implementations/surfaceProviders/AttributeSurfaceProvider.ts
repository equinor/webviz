import type { Options } from "@hey-api/client-axios";
import { hashKey } from "@tanstack/query-core";
import { isEqual } from "lodash";

import type { GetStatisticalSurfaceDataHybridData_api } from "@api";
import {
    SurfaceAttributeType_api,
    SurfaceStatisticFunction_api,
    SurfaceTimeType_api,
    getRealizationSurfacesMetadataOptions,
    getStatisticalSurfaceDataHybrid,
    getStatisticalSurfaceDataHybridQueryKey,
    getSurfaceDataOptions,
} from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { sortStringArray } from "@lib/utils/arrays";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr, type FullSurfaceAddress } from "@modules/_shared/Surface/surfaceAddress";

import { Representation } from "../../../settings/implementations/RepresentationSetting";

import {
    createEnsembleUpdater,
    createRealizationUpdater,
    createSensitivityUpdater,
    createStatisticFunctionUpdater,
} from "./_commonSettingsUpdaters";
import { SurfaceDataFormat, type SurfaceData, type SurfaceStoredData } from "./types";

const surfaceSettings = [
    Setting.ENSEMBLE,
    Setting.REPRESENTATION,
    Setting.REALIZATION,
    Setting.STATISTIC_FUNCTION,
    Setting.SENSITIVITY,
    Setting.ATTRIBUTE,
    Setting.FORMATION_NAME,
    Setting.TIME_POINT,
    Setting.TIME_INTERVAL,
    Setting.COLOR_SCALE,
    Setting.CONTOURS,
] as const;
export type AttributeSurfaceSettings = typeof surfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<AttributeSurfaceSettings>;

export enum AttributeSurfaceType {
    ATTRIBUTE_STATIC = "attribute_static",
    ATTRIBUTE_TIME_STEP = "attribute_time_step",
    ATTRIBUTE_INTERVAL = "attribute_interval",
}
const ALLOWED_SURFACE_TYPES_FROM_API = [
    SurfaceAttributeType_api.UNKNOWN,
    SurfaceAttributeType_api.PROPERTY,
    SurfaceAttributeType_api.THICKNESS,
    SurfaceAttributeType_api.VOLUMES,
    SurfaceAttributeType_api.FLUID_CONTACT,
    SurfaceAttributeType_api.FACIES_THICKNESS,
    SurfaceAttributeType_api.PINCHOUT,
    SurfaceAttributeType_api.SUBCROP,
    SurfaceAttributeType_api.TIME,
    SurfaceAttributeType_api.VELOCITY,
    SurfaceAttributeType_api.VOLUMES,
];
const AttributeSurfaceTypeToNameMap = {
    [AttributeSurfaceType.ATTRIBUTE_STATIC]: "Static Surface",
    [AttributeSurfaceType.ATTRIBUTE_TIME_STEP]: "Time Step Surface",
    [AttributeSurfaceType.ATTRIBUTE_INTERVAL]: "Interval Surface",
};
export type SurfaceProviderArgs = {
    surfaceType: AttributeSurfaceType;
};

export class AttributeSurfaceProvider
    implements CustomDataProviderImplementation<AttributeSurfaceSettings, SurfaceData, SurfaceStoredData>
{
    settings = surfaceSettings;

    private _dataFormat: SurfaceDataFormat = SurfaceDataFormat.FLOAT;
    private _surfaceType: AttributeSurfaceType;

    constructor(...params: [SurfaceProviderArgs]) {
        this._surfaceType = params[0].surfaceType;
    }

    getDefaultSettingsValues() {
        return {
            [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api.MEAN,
        };
    }

    getDefaultName(): string {
        return AttributeSurfaceTypeToNameMap[this._surfaceType as keyof typeof AttributeSurfaceTypeToNameMap];
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<AttributeSurfaceSettings, SurfaceData, SurfaceStoredData>):
        | [number, number]
        | null {
        const data = getData()?.surfaceData;
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }
    isTimePointSurface(): boolean {
        return this._surfaceType === AttributeSurfaceType.ATTRIBUTE_TIME_STEP;
    }
    isTimeIntervalSurface(): boolean {
        return this._surfaceType === AttributeSurfaceType.ATTRIBUTE_INTERVAL;
    }
    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        settingAttributesUpdater,
        storedDataUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<AttributeSurfaceSettings, SurfaceStoredData>) {
        settingAttributesUpdater(Setting.REALIZATION, ({ getLocalSetting }) => {
            const realizationOrStatistics = getLocalSetting(Setting.REPRESENTATION);
            const enabled = realizationOrStatistics === Representation.REALIZATION;
            return { enabled, visible: enabled };
        });
        settingAttributesUpdater(Setting.SENSITIVITY, ({ getLocalSetting }) => {
            const realizationOrStatistics = getLocalSetting(Setting.REPRESENTATION);
            const enabled = realizationOrStatistics === Representation.ENSEMBLE_STATISTICS;
            return { enabled, visible: enabled };
        });
        settingAttributesUpdater(Setting.STATISTIC_FUNCTION, ({ getLocalSetting }) => {
            const realizationOrStatistics = getLocalSetting(Setting.REPRESENTATION);
            const enabled = realizationOrStatistics === Representation.ENSEMBLE_STATISTICS;
            return { enabled, visible: enabled };
        });
        settingAttributesUpdater(Setting.TIME_POINT, () => {
            if (this.isTimePointSurface()) {
                return { enabled: true, visible: true };
            }
            return { enabled: false, visible: false };
        });
        settingAttributesUpdater(Setting.TIME_INTERVAL, () => {
            if (this.isTimeIntervalSurface()) {
                return { enabled: true, visible: true };
            }
            return { enabled: false, visible: false };
        });
        availableSettingsUpdater(Setting.REPRESENTATION, () => {
            return [Representation.REALIZATION, Representation.ENSEMBLE_STATISTICS];
        });
        availableSettingsUpdater(Setting.STATISTIC_FUNCTION, createStatisticFunctionUpdater());
        availableSettingsUpdater(Setting.ENSEMBLE, createEnsembleUpdater());
        availableSettingsUpdater(Setting.SENSITIVITY, createSensitivityUpdater(workbenchSession));

        const surfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getRealizationSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });
        });
        availableSettingsUpdater(Setting.REALIZATION, createRealizationUpdater());
        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(surfaceMetadataDep);

            if (!data) {
                return [];
            }

            let filteredSurfaceMetadata = data.surfaces;
            if (this._surfaceType === AttributeSurfaceType.ATTRIBUTE_STATIC) {
                filteredSurfaceMetadata = data.surfaces.filter(
                    (surface) =>
                        ALLOWED_SURFACE_TYPES_FROM_API.includes(surface.attribute_type) &&
                        surface.time_type === SurfaceTimeType_api.NO_TIME,
                );
            } else if (this._surfaceType === AttributeSurfaceType.ATTRIBUTE_TIME_STEP) {
                filteredSurfaceMetadata = data.surfaces.filter(
                    (surface) =>
                        ALLOWED_SURFACE_TYPES_FROM_API.includes(surface.attribute_type) &&
                        surface.time_type === SurfaceTimeType_api.TIME_POINT,
                );
            } else if (this._surfaceType === AttributeSurfaceType.ATTRIBUTE_INTERVAL) {
                filteredSurfaceMetadata = data.surfaces.filter(
                    (surface) =>
                        ALLOWED_SURFACE_TYPES_FROM_API.includes(surface.attribute_type) &&
                        surface.time_type === SurfaceTimeType_api.INTERVAL,
                );
            }
            const availableAttributes = [
                ...Array.from(new Set(filteredSurfaceMetadata.map((surface) => surface.attribute_name))),
            ];

            return availableAttributes;
        });
        availableSettingsUpdater(Setting.FORMATION_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const data = getHelperDependency(surfaceMetadataDep);

            if (!attribute || !data) {
                return [];
            }

            const availableSurfaceNames = [
                ...Array.from(
                    new Set(
                        data.surfaces.filter((surface) => surface.attribute_name === attribute).map((el) => el.name),
                    ),
                ),
            ];
            return sortStringArray(availableSurfaceNames, data.surface_names_in_strat_order);
        });

        availableSettingsUpdater(Setting.TIME_POINT, ({ getLocalSetting, getHelperDependency }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const formationName = getLocalSetting(Setting.FORMATION_NAME);
            const data = getHelperDependency(surfaceMetadataDep);

            if (!attribute || !formationName || !data) {
                return [];
            }

            if (this._surfaceType === AttributeSurfaceType.ATTRIBUTE_TIME_STEP) {
                return data.time_points_iso_str;
            }

            return [SurfaceTimeType_api.NO_TIME];
        });
        availableSettingsUpdater(Setting.TIME_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const formationName = getLocalSetting(Setting.FORMATION_NAME);
            const data = getHelperDependency(surfaceMetadataDep);

            if (!attribute || !formationName || !data) {
                return [];
            }

            if (this._surfaceType === AttributeSurfaceType.ATTRIBUTE_INTERVAL) {
                return data.time_intervals_iso_str;
            }

            return [SurfaceTimeType_api.NO_TIME];
        });

        storedDataUpdater("realizations", ({ getGlobalSetting, getLocalSetting }) => {
            const filterFunction = getGlobalSetting("realizationFilterFunction");
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return [];
            }

            return filterFunction(ensembleIdent);
        });
        //Needed to trigger updates when switching between realization and ensemble statistics
        storedDataUpdater("realizationMode", ({ getLocalSetting }) => {
            return getLocalSetting(Setting.REPRESENTATION) ?? Representation.REALIZATION;
        });
    }

    fetchData(params: FetchDataParams<AttributeSurfaceSettings, SurfaceData>): Promise<SurfaceData> {
        const {
            getSetting,
            getStoredData,
            getWorkbenchSession,
            fetchQuery,
            setProgressMessage,
            onFetchCancelOrFinish,
        } = params;

        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        let filteredRealizations = getStoredData("realizations") ?? [];
        const formationName = getSetting(Setting.FORMATION_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);

        const representation = getSetting(Setting.REPRESENTATION);
        const workbenchSession = getWorkbenchSession();

        let surfaceAddress: FullSurfaceAddress | null = null;
        if (ensembleIdent && formationName && attribute) {
            const addrBuilder = new SurfaceAddressBuilder();
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(formationName);
            addrBuilder.withAttribute(attribute);
            if (this.isTimePointSurface()) {
                const timeOrInterval = getSetting(Setting.TIME_POINT);
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }
            if (this.isTimeIntervalSurface()) {
                const timeOrInterval = getSetting(Setting.TIME_INTERVAL);
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }
            const currentEnsemble = workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent);

            if (representation === Representation.REALIZATION) {
                const realization = getSetting(Setting.REALIZATION);
                addrBuilder.withRealization(realization!);
                surfaceAddress = addrBuilder.buildRealizationAddress();
                const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

                const surfaceDataOptions = getSurfaceDataOptions({
                    query: {
                        surf_addr_str: surfAddrStr ?? "",
                        data_format: this._dataFormat,
                        resample_to_def_str: null,
                    },
                });

                const promise = fetchQuery(surfaceDataOptions).then((data) => ({
                    format: this._dataFormat,
                    surfaceData: transformSurfaceData(data),
                }));

                return promise as Promise<SurfaceData>;
            }

            const statisticFunction = getSetting(Setting.STATISTIC_FUNCTION);
            const sensitivityNameCasePair = getSetting(Setting.SENSITIVITY);
            if (statisticFunction) {
                addrBuilder.withStatisticFunction(statisticFunction);
                // If sensitivity is set, filter realizations further to only include the realizations that are in the sensitivity
                if (sensitivityNameCasePair) {
                    const sensitivity = currentEnsemble
                        ?.getSensitivities()
                        ?.getCaseByName(
                            sensitivityNameCasePair.sensitivityName,
                            sensitivityNameCasePair.sensitivityCase,
                        );

                    const sensitivityRealizations = sensitivity?.realizations ?? [];

                    filteredRealizations = filteredRealizations.filter((realization) =>
                        sensitivityRealizations.includes(realization),
                    );
                }

                // If realizations are filtered, update the address
                const allRealizations = currentEnsemble?.getRealizations() ?? [];
                if (!isEqual([...allRealizations], [...filteredRealizations])) {
                    addrBuilder.withStatisticRealizations([...filteredRealizations]);
                }

                surfaceAddress = addrBuilder.buildStatisticalAddress();
            }
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const apiFunctionArgs: Options<GetStatisticalSurfaceDataHybridData_api, false> = {
            query: {
                surf_addr_str: surfAddrStr ?? "NO_SURF_ADDR",
                data_format: this._dataFormat,
                resample_to_def_str: null,
            },
        };
        const queryKey = getStatisticalSurfaceDataHybridQueryKey(apiFunctionArgs);

        // For now use just a fixed delay and max duration in seconds
        // Maybe later extend delay/backoff to include:
        //  * backoff: none, linear, exponential
        //  * maxDelayS - maximum delay for linear or exponential backoff
        //  * jitter
        const queryOptions = wrapLongRunningQuery({
            queryFn: getStatisticalSurfaceDataHybrid,
            queryFnArgs: apiFunctionArgs,
            queryKey: queryKey,
            delayBetweenPollsSecs: 1.0,
            maxTotalDurationSecs: 120,
        });

        function handleTaskProgress(progressMessage: string | null) {
            setProgressMessage(progressMessage);
        }
        const unsubscribe = lroProgressBus.subscribe(hashKey(queryKey), handleTaskProgress);
        onFetchCancelOrFinish(() => {
            unsubscribe();
        });

        const promise = fetchQuery({ ...queryOptions }).then((data) => ({
            format: this._dataFormat,
            surfaceData: transformSurfaceData(data),
        }));

        return promise as Promise<SurfaceData>;
    }
}
