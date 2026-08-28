import { hashKey } from "@tanstack/query-core";
import { isEqual } from "lodash-es";

import {
    SurfaceStatisticFunction_api,
    getInitialFluidContactStatisticalSurfaceDataHybrid,
    getInitialFluidContactStatisticalSurfaceDataHybridQueryKey,
    getInitialFluidContactSurfaceDataOptions,
    getInitialFluidContactSurfacesMetadataOptions,
    type GetInitialFluidContactStatisticalSurfaceDataHybridData_api,
    type InitialFluidContactType_api,
    type Options,
} from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { sortStringArray } from "@lib/utils/arrays";
import { assertNonNull } from "@lib/utils/assertNonNull";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";

import { Representation } from "../../../settings/implementations/RepresentationSetting";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableRealizationsForEnsembleIdent,
} from "../../dependencyFunctions/sharedSettingUpdaterFunctions";

import { resolveSensitivityConstraints, resolveStatisticFunctionConstraints } from "./_commonSettingsUpdaters";
import { SurfaceDataFormat, type SurfaceData, type SurfaceStoredData } from "./types";

const initialFluidContactSurfaceSettings = [
    Setting.ENSEMBLE,
    Setting.REPRESENTATION,
    Setting.REALIZATION,
    Setting.STATISTIC_FUNCTION,
    Setting.SENSITIVITY,
    Setting.SURFACE_NAME,
    Setting.FLUID_CONTACT,
    Setting.DEPTH_COLOR_SCALE,
    Setting.CONTOURS,
] as const;

export type InitialFluidContactSurfaceSettings = typeof initialFluidContactSurfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<InitialFluidContactSurfaceSettings>;

export class InitialFluidContactSurfaceProvider implements CustomDataProviderImplementation<
    InitialFluidContactSurfaceSettings,
    SurfaceData,
    SurfaceStoredData
> {
    settings = initialFluidContactSurfaceSettings;

    getDefaultSettingsValues() {
        return { [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api.MEAN };
    }

    getDefaultName(): string {
        return "Initial Fluid Contact Surface";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderAccessors<
        InitialFluidContactSurfaceSettings,
        SurfaceData,
        SurfaceStoredData
    >): [number, number] | null {
        const surfaceData = getData()?.surfaceData;
        return surfaceData ? [surfaceData.value_min, surfaceData.value_max] : null;
    }

    setupBindings({
        setting,
        makeSharedResult,
        queryClient,
        storedData,
        workbenchSession,
    }: SetupBindingsContext<InitialFluidContactSurfaceSettings, SurfaceStoredData>): void {
        setting(Setting.REALIZATION).bindAttributes({
            read(read) {
                return { representation: read.localSetting(Setting.REPRESENTATION) };
            },
            resolve({ representation }) {
                const enabled = representation === Representation.REALIZATION;
                return { enabled, visible: enabled };
            },
        });

        for (const statisticalSetting of [Setting.STATISTIC_FUNCTION, Setting.SENSITIVITY] as const) {
            setting(statisticalSetting).bindAttributes({
                read(read) {
                    return { representation: read.localSetting(Setting.REPRESENTATION) };
                },
                resolve({ representation }) {
                    const enabled = representation === Representation.ENSEMBLE_STATISTICS;
                    return { enabled, visible: enabled };
                },
            });
        }

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

        setting(Setting.SENSITIVITY).bindValueConstraints({
            read(read) {
                return { ensembleIdent: read.localSetting(Setting.ENSEMBLE) };
            },
            resolve({ ensembleIdent }) {
                return resolveSensitivityConstraints(ensembleIdent, workbenchSession);
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

        setting(Setting.REALIZATION).bindValueConstraints({
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

        const metadata = makeSharedResult({
            debugName: "InitialFluidContactSurfaceMetadata",
            read(read) {
                return { ensembleIdent: read.localSetting(Setting.ENSEMBLE) };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
                if (!ensembleIdent) {
                    return null;
                }
                return await queryClient.fetchQuery({
                    ...getInitialFluidContactSurfacesMetadataOptions({
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

        setting(Setting.FLUID_CONTACT).bindValueConstraints({
            read(read) {
                return { metadata: read.sharedResult(metadata) };
            },
            resolve({ metadata }) {
                return [...new Set(metadata?.map((item) => item.contact) ?? [])].sort();
            },
        });

        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read(read) {
                return {
                    contact: read.localSetting(Setting.FLUID_CONTACT),
                    metadata: read.sharedResult(metadata),
                };
            },
            resolve({ contact, metadata }) {
                const names = metadata?.filter((item) => item.contact === contact).map((item) => item.name) ?? [];
                return sortStringArray([...new Set(names)], []);
            },
        });

        storedData("realizations").bindValue({
            read(read) {
                return {
                    filterFunction: read.globalSetting("realizationFilterFunction"),
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            resolve({ filterFunction, ensembleIdent }) {
                return ensembleIdent ? [...filterFunction(ensembleIdent)] : [];
            },
        });

        storedData("realizationMode").bindValue({
            read(read) {
                return { representation: read.localSetting(Setting.REPRESENTATION) };
            },
            resolve({ representation }) {
                return representation ?? Representation.REALIZATION;
            },
        });
    }

    fetchData(params: FetchDataParams<InitialFluidContactSurfaceSettings, SurfaceData, SurfaceStoredData>): Promise<SurfaceData> {
        const { getSetting, getStoredData, getWorkbenchSession, fetchQuery, setProgressMessage, onFetchCancelOrFinish } =
            params;
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const surfaceName = assertNonNull(getSetting(Setting.SURFACE_NAME), "No surface selected");
        const contact = assertNonNull(getSetting(Setting.FLUID_CONTACT), "No fluid contact selected");
        const representation = getSetting(Setting.REPRESENTATION);

        if (representation === Representation.REALIZATION) {
            const realizationNum = assertNonNull(getSetting(Setting.REALIZATION), "No realization selected");
            const queryOptions = getInitialFluidContactSurfaceDataOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    realization_num: realizationNum,
                    name: surfaceName,
                    contact: contact as InitialFluidContactType_api,
                    data_format: SurfaceDataFormat.FLOAT,
                    resample_to_def_str: null,
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return fetchQuery(queryOptions).then((data) => ({
                format: SurfaceDataFormat.FLOAT,
                surfaceData: transformSurfaceData(data),
            })) as Promise<SurfaceData>;
        }

        const statisticFunction = assertNonNull(
            getSetting(Setting.STATISTIC_FUNCTION),
            "No statistic function selected",
        );
        let filteredRealizations = [...(getStoredData("realizations") ?? [])];
        const currentEnsemble = getWorkbenchSession().getEnsembleSet().findEnsemble(ensembleIdent);
        const sensitivityNameCasePair = getSetting(Setting.SENSITIVITY);
        if (sensitivityNameCasePair) {
            const sensitivity = currentEnsemble
                ?.getSensitivities()
                ?.getCaseByName(sensitivityNameCasePair.sensitivityName, sensitivityNameCasePair.sensitivityCase);
            filteredRealizations = filteredRealizations.filter((realization) =>
                (sensitivity?.realizations ?? []).includes(realization),
            );
        }

        const allRealizations = currentEnsemble?.getRealizations() ?? [];
        const requestedRealizations = isEqual([...allRealizations], filteredRealizations)
            ? undefined
            : filteredRealizations;
        const apiFunctionArgs: Options<GetInitialFluidContactStatisticalSurfaceDataHybridData_api, false> = {
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                name: surfaceName,
                contact: contact as InitialFluidContactType_api,
                statistic_function: statisticFunction,
                realizations: requestedRealizations,
                data_format: SurfaceDataFormat.FLOAT,
                resample_to_def_str: null,
            },
        };
        const queryKey = getInitialFluidContactStatisticalSurfaceDataHybridQueryKey(apiFunctionArgs);
        const queryOptions = wrapLongRunningQuery({
            queryFn: getInitialFluidContactStatisticalSurfaceDataHybrid,
            queryFnArgs: apiFunctionArgs,
            queryKey,
            delayBetweenPollsSecs: 1,
            maxTotalDurationSecs: 120,
        });
        const unsubscribe = lroProgressBus.subscribe(hashKey(queryKey), setProgressMessage);
        onFetchCancelOrFinish(unsubscribe);

        return fetchQuery({ ...queryOptions }).then((data) => ({
            format: SurfaceDataFormat.FLOAT,
            surfaceData: transformSurfaceData(data),
        })) as Promise<SurfaceData>;
    }
}
