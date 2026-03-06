import { hashKey } from "@tanstack/query-core";
import { isEqual } from "lodash";

import {
    SurfaceAttributeType_api,
    SurfaceStatisticFunction_api,
    getRealizationSurfacesMetadataOptions,
    getStatisticalSurfaceDataHybrid,
    getStatisticalSurfaceDataHybridQueryKey,
    getSurfaceDataOptions,
} from "@api";
import type { GetStatisticalSurfaceDataHybridData_api, Options } from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { sortStringArray } from "@lib/utils/arrays";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { SurfaceAddressBuilder, type FullSurfaceAddress } from "@modules/_shared/Surface";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import { Representation } from "../../../settings/implementations/RepresentationSetting";

import {
    resolveEnsembleConstraints,
    resolveSensitivityConstraints,
    resolveStatisticFunctionConstraints,
} from "./_commonSettingsUpdaters";
import { SurfaceDataFormat, type SurfaceData, type SurfaceStoredData } from "./types";

const surfaceSettings = [
    Setting.ENSEMBLE,
    Setting.REPRESENTATION,
    Setting.REALIZATION,
    Setting.STATISTIC_FUNCTION,
    Setting.SENSITIVITY,
    Setting.DEPTH_ATTRIBUTE,
    Setting.SURFACE_NAME,
    Setting.DEPTH_COLOR_SCALE,
    Setting.CONTOURS,
] as const;
export type DepthSurfaceSettings = typeof surfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<DepthSurfaceSettings>;

export enum SurfaceType {
    DEPTH = "depth",
}

export type SurfaceProviderArgs = {
    surfaceType: SurfaceType;
};

export class DepthSurfaceProvider
    implements CustomDataProviderImplementation<DepthSurfaceSettings, SurfaceData, SurfaceStoredData>
{
    settings = surfaceSettings;

    private _dataFormat: SurfaceDataFormat = SurfaceDataFormat.FLOAT;

    getDefaultSettingsValues() {
        return {
            [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api.MEAN,
        };
    }

    getDefaultName(): string {
        return "Depth Surface";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderAccessors<DepthSurfaceSettings, SurfaceData, SurfaceStoredData>): [number, number] | null {
        const data = getData()?.surfaceData;
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    setupBindings({
        setting,
        storedData,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<DepthSurfaceSettings, SurfaceStoredData>) {
        setting(Setting.REALIZATION).bindAttributes({
            read({ read }) {
                return { representation: read.localSetting(Setting.REPRESENTATION) };
            },
            resolve({ representation }) {
                const enabled = representation === Representation.REALIZATION;
                return { enabled, visible: enabled };
            },
        });

        setting(Setting.SENSITIVITY).bindAttributes({
            read({ read }) {
                return { representation: read.localSetting(Setting.REPRESENTATION) };
            },
            resolve({ representation }) {
                const enabled = representation === Representation.ENSEMBLE_STATISTICS;
                return { enabled, visible: enabled };
            },
        });

        setting(Setting.STATISTIC_FUNCTION).bindAttributes({
            read({ read }) {
                return { representation: read.localSetting(Setting.REPRESENTATION) };
            },
            resolve({ representation }) {
                const enabled = representation === Representation.ENSEMBLE_STATISTICS;
                return { enabled, visible: enabled };
            },
        });

        setting(Setting.REPRESENTATION).bindValueConstraints({
            resolve() {
                return [Representation.REALIZATION, Representation.ENSEMBLE_STATISTICS];
            },
        });

        setting(Setting.STATISTIC_FUNCTION).bindValueConstraints({
            resolve() {
                return resolveStatisticFunctionConstraints();
            },
        });

        setting(Setting.ENSEMBLE).bindValueConstraints({
            read({ read }) {
                return { fieldId: read.globalSetting("fieldId"), ensembles: read.globalSetting("ensembles") ?? [] };
            },
            resolve({ fieldId, ensembles }) {
                if (!fieldId || ensembles.length === 0) {
                    return [];
                }

                return resolveEnsembleConstraints(fieldId, ensembles);
            },
        });

        setting(Setting.SENSITIVITY).bindValueConstraints({
            read({ read }) {
                return { ensembleIdent: read.localSetting(Setting.ENSEMBLE) };
            },
            resolve({ ensembleIdent }) {
                return resolveSensitivityConstraints(ensembleIdent, workbenchSession);
            },
        });

        const surfaceMetadataDep = makeSharedResult({
            debugName: "SurfaceMetadata",
            read({ read }) {
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

        setting(Setting.REALIZATION).bindValueConstraints({
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realizationFilterFunction: read.globalSetting("realizationFilterFunction"),
                };
            },
            resolve({ ensembleIdent, realizationFilterFunction }) {
                if (!ensembleIdent || !realizationFilterFunction) {
                    return [];
                }
                return [...realizationFilterFunction(ensembleIdent)];
            },
        });

        setting(Setting.DEPTH_ATTRIBUTE).bindValueConstraints({
            read({ read }) {
                return { data: read.sharedResult(surfaceMetadataDep) };
            },
            resolve({ data }) {
                if (!data) {
                    return [];
                }

                const filteredSurfaceMetadata = data.surfaces.filter(
                    (surface) => surface.attribute_type === SurfaceAttributeType_api.DEPTH,
                );

                return [...new Set(filteredSurfaceMetadata.map((surface) => surface.attribute_name))];
            },
        });

        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read({ read }) {
                return {
                    attribute: read.localSetting(Setting.DEPTH_ATTRIBUTE),
                    data: read.sharedResult(surfaceMetadataDep),
                };
            },
            resolve({ attribute, data }) {
                if (!attribute || !data) {
                    return [];
                }

                const availableSurfaceNames = [
                    ...new Set(
                        data.surfaces.filter((surface) => surface.attribute_name === attribute).map((el) => el.name),
                    ),
                ];
                return sortStringArray(availableSurfaceNames, data.surface_names_in_strat_order);
            },
        });

        storedData("realizations").bindValue({
            read({ read }) {
                return {
                    filterFunction: read.globalSetting("realizationFilterFunction"),
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            resolve({ filterFunction, ensembleIdent }) {
                if (!ensembleIdent || !filterFunction) {
                    return [];
                }
                return [...filterFunction(ensembleIdent)];
            },
        });

        //Needed to trigger updates when switching between realization and ensemble statistics
        storedData("realizationMode").bindValue({
            read({ read }) {
                return { representation: read.localSetting(Setting.REPRESENTATION) };
            },
            resolve({ representation }) {
                return representation ?? Representation.REALIZATION;
            },
        });
    }

    fetchData(params: FetchDataParams<DepthSurfaceSettings, SurfaceData>): Promise<SurfaceData> {
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
        const surfaceName = getSetting(Setting.SURFACE_NAME);
        const attribute = getSetting(Setting.DEPTH_ATTRIBUTE);

        const representation = getSetting(Setting.REPRESENTATION);
        const workbenchSession = getWorkbenchSession();

        let surfaceAddress: FullSurfaceAddress | null = null;
        if (ensembleIdent && surfaceName && attribute) {
            const addrBuilder = new SurfaceAddressBuilder();
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);

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
                        ...makeCacheBustingQueryParam(surfaceAddress ? ensembleIdent : null),
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
