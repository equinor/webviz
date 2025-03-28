import type { SurfaceDataPng_api } from "@api";
import {
    SurfaceStatisticFunction_api,
    SurfaceTimeType_api,
    getRealizationSurfacesMetadataOptions,
    getSurfaceDataOptions,
} from "@api";
import type {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/LayerFramework/interfacesAndTypes/customDataLayerImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/LayerFramework/interfacesAndTypes/customSettingsHandler";
import type { SensitivityNameCasePair } from "@modules/_shared/LayerFramework/settings/implementations/SensitivitySetting";
import type { MakeSettingTypesMap } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import type { FullSurfaceAddress } from "@modules/_shared/Surface";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import type { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import { isEqual } from "lodash";

const statisicalSurfaceSettings = [
    Setting.ENSEMBLE,
    Setting.STATISTIC_FUNCTION,
    Setting.SENSITIVITY,
    Setting.ATTRIBUTE,
    Setting.SURFACE_NAME,
    Setting.TIME_OR_INTERVAL,
    Setting.COLOR_SCALE,
] as const;
export type StatisticalSurfaceSettings = typeof statisicalSurfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<StatisticalSurfaceSettings>;

export enum SurfaceDataFormat {
    FLOAT = "float",
    PNG = "png",
}

export type StatisticalSurfaceData =
    | { format: SurfaceDataFormat.FLOAT; surfaceData: SurfaceDataFloat_trans }
    | { format: SurfaceDataFormat.PNG; surfaceData: SurfaceDataPng_api };

export class StatisticalSurfaceLayer
    implements CustomDataLayerImplementation<StatisticalSurfaceSettings, StatisticalSurfaceData>
{
    settings = statisicalSurfaceSettings;

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
    }: DataLayerInformationAccessors<StatisticalSurfaceSettings, StatisticalSurfaceData>): [number, number] | null {
        const data = getData()?.surfaceData;
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<StatisticalSurfaceSettings>) {
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
                })
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
                        data.surfaces.filter((surface) => surface.attribute_name === attribute).map((el) => el.name)
                    )
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
                            .map((el) => el.time_type)
                    )
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
    }

    fetchData({
        getSetting,
        getWorkbenchSession,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<StatisticalSurfaceSettings, StatisticalSurfaceData>): Promise<StatisticalSurfaceData> {
        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();

        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const surfaceName = getSetting(Setting.SURFACE_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const statisticFunction = getSetting(Setting.STATISTIC_FUNCTION);
        const sensitivityNameCasePair = getSetting(Setting.SENSITIVITY);

        const workbenchSession = getWorkbenchSession();

        if (ensembleIdent && surfaceName && attribute) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);

            // Get filtered realizations from workbench
            let filteredRealizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(ensembleIdent)
                .getFilteredRealizations();
            const currentEnsemble = workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent);

            // If sensitivity is set, filter realizations further to only include the realizations that are in the sensitivity
            if (sensitivityNameCasePair) {
                const sensitivity = currentEnsemble
                    ?.getSensitivities()
                    ?.getCaseByName(sensitivityNameCasePair.sensitivityName, sensitivityNameCasePair.sensitivityCase);

                const sensitivityRealizations = sensitivity?.realizations ?? [];

                filteredRealizations = filteredRealizations.filter((realization) =>
                    sensitivityRealizations.includes(realization)
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

            if (statisticFunction) {
                addrBuilder.withStatisticFunction(statisticFunction);
            }
            surfaceAddress = addrBuilder.buildStatisticalAddress();
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const queryOptions = getSurfaceDataOptions({
            query: {
                surf_addr_str: surfAddrStr ?? "",
                data_format: this._dataFormat,
                resample_to_def_str: null,
            },
        });

        registerQueryKey(queryOptions.queryKey);

        const promise = queryClient
            .fetchQuery({
                ...queryOptions,
            })
            .then((data) => ({ format: this._dataFormat, surfaceData: transformSurfaceData(data) }));

        return promise as Promise<StatisticalSurfaceData>;
    }
}
