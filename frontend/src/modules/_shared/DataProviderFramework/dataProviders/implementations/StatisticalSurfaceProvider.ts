import type { Options } from "@hey-api/client-axios";
import { hashKey } from "@tanstack/react-query";
import { isEqual } from "lodash";

import type { SurfaceDataPng_api, GetStatisticalSurfaceDataHybridData_api } from "@api";
import {
    SurfaceStatisticFunction_api,
    SurfaceTimeType_api,
    getRealizationSurfacesMetadataOptions,
    getStatisticalSurfaceDataHybrid,
    getStatisticalSurfaceDataHybridQueryKey,
} from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { SensitivityNameCasePair } from "@modules/_shared/DataProviderFramework/settings/implementations/SensitivitySetting";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { FullSurfaceAddress } from "@modules/_shared/Surface";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import type { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

const statisticalSurfaceSettings = [
    Setting.ENSEMBLE,
    Setting.STATISTIC_FUNCTION,
    Setting.SENSITIVITY,
    Setting.ATTRIBUTE,
    Setting.SURFACE_NAME,
    Setting.TIME_OR_INTERVAL,
    Setting.COLOR_SCALE,
    Setting.CONTOURS,
] as const;
export type StatisticalSurfaceSettings = typeof statisticalSurfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<StatisticalSurfaceSettings>;

export enum SurfaceDataFormat {
    FLOAT = "float",
    PNG = "png",
}

export type StatisticalSurfaceData =
    | { format: SurfaceDataFormat.FLOAT; surfaceData: SurfaceDataFloat_trans }
    | { format: SurfaceDataFormat.PNG; surfaceData: SurfaceDataPng_api };

export type StatisticalSurfaceStoredData = {
    realizations: readonly number[];
};

export class StatisticalSurfaceProvider
    implements
        CustomDataProviderImplementation<
            StatisticalSurfaceSettings,
            StatisticalSurfaceData,
            StatisticalSurfaceStoredData
        >
{
    settings = statisticalSurfaceSettings;

    private _dataFormat: SurfaceDataFormat;

    constructor(dataFormat?: SurfaceDataFormat) {
        this._dataFormat = dataFormat ?? SurfaceDataFormat.PNG;
    }

    getDefaultSettingsValues() {
        return {
            [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api.MEAN,
        };
    }

    getDefaultName(): string {
        return "Statistical Surface";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<
        StatisticalSurfaceSettings,
        StatisticalSurfaceData,
        StatisticalSurfaceStoredData
    >): [number, number] | null {
        const data = getData()?.surfaceData;
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        storedDataUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<StatisticalSurfaceSettings, StatisticalSurfaceStoredData>) {
        availableSettingsUpdater(Setting.STATISTIC_FUNCTION, () => Object.values(SurfaceStatisticFunction_api));
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });
        availableSettingsUpdater(Setting.SENSITIVITY, ({ getLocalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return [];
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const currentEnsemble = ensembleSet.findEnsemble(ensembleIdent);
            const sensitivities = currentEnsemble?.getSensitivities()?.getSensitivityArr() ?? [];
            if (sensitivities.length === 0) {
                return [];
            }
            const availableSensitivityPairs: SensitivityNameCasePair[] = [];
            sensitivities.map((sensitivity) =>
                sensitivity.cases.map((sensitivityCase) => {
                    availableSensitivityPairs.push({
                        sensitivityName: sensitivity.name,
                        sensitivityCase: sensitivityCase.name,
                    });
                }),
            );
            return availableSensitivityPairs;
        });

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

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(surfaceMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(new Set(data.surfaces.map((surface) => surface.attribute_name))),
            ];

            return availableAttributes;
        });
        availableSettingsUpdater(Setting.SURFACE_NAME, ({ getHelperDependency, getLocalSetting }) => {
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

            return availableSurfaceNames;
        });

        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const attribute = getLocalSetting(Setting.ATTRIBUTE);
            const surfaceName = getLocalSetting(Setting.SURFACE_NAME);
            const data = getHelperDependency(surfaceMetadataDep);

            if (!attribute || !surfaceName || !data) {
                return [];
            }

            const availableTimeOrIntervals: string[] = [];
            const availableTimeTypes = [
                ...Array.from(
                    new Set(
                        data.surfaces
                            .filter((surface) => surface.attribute_name === attribute && surface.name === surfaceName)
                            .map((el) => el.time_type),
                    ),
                ),
            ];

            if (availableTimeTypes.includes(SurfaceTimeType_api.NO_TIME)) {
                availableTimeOrIntervals.push(SurfaceTimeType_api.NO_TIME);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.TIME_POINT)) {
                availableTimeOrIntervals.push(...data.time_points_iso_str);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.INTERVAL)) {
                availableTimeOrIntervals.push(...data.time_intervals_iso_str);
            }

            return availableTimeOrIntervals;
        });

        storedDataUpdater("realizations", ({ getGlobalSetting, getLocalSetting }) => {
            const filterFunction = getGlobalSetting("realizationFilterFunction");
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return [];
            }

            return filterFunction(ensembleIdent);
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        getWorkbenchSession,
        fetchQuery,
        setProgressMessage,
        onFetchCancelOrFinish,
    }: FetchDataParams<StatisticalSurfaceSettings, StatisticalSurfaceData>): Promise<StatisticalSurfaceData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        let filteredRealizations = getStoredData("realizations") ?? [];
        const surfaceName = getSetting(Setting.SURFACE_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const statisticFunction = getSetting(Setting.STATISTIC_FUNCTION);
        const sensitivityNameCasePair = getSetting(Setting.SENSITIVITY);

        const workbenchSession = getWorkbenchSession();

        let surfaceAddress: FullSurfaceAddress | null = null;
        if (ensembleIdent && surfaceName && attribute && statisticFunction) {
            const addrBuilder = new SurfaceAddressBuilder();
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);
            addrBuilder.withStatisticFunction(statisticFunction);

            const currentEnsemble = workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent);

            // If sensitivity is set, filter realizations further to only include the realizations that are in the sensitivity
            if (sensitivityNameCasePair) {
                const sensitivity = currentEnsemble
                    ?.getSensitivities()
                    ?.getCaseByName(sensitivityNameCasePair.sensitivityName, sensitivityNameCasePair.sensitivityCase);

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

            if (timeOrInterval !== SurfaceTimeType_api.NO_TIME) {
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }

            surfaceAddress = addrBuilder.buildStatisticalAddress();
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

        return promise as Promise<StatisticalSurfaceData>;
    }
}
