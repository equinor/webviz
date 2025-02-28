import {
    SurfaceDataPng_api,
    SurfaceStatisticFunction_api,
    SurfaceTimeType_api,
    getRealizationSurfacesMetadataOptions,
    getSurfaceDataOptions,
} from "@api";
import {
    BoundingBox,
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    DefineDependenciesArgs,
    FetchDataParams,
    LayerColoringType,
} from "@modules/_shared/LayerFramework/interfaces";
import { SensitivityNameCasePair } from "@modules/_shared/LayerFramework/settings/implementations/SensitivitySetting";
import { MakeSettingTypesMap, SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import { isEqual } from "lodash";

const statisicalSurfaceSettings = [
    SettingType.ENSEMBLE,
    SettingType.STATISTIC_FUNCTION,
    SettingType.SENSITIVITY,
    SettingType.ATTRIBUTE,
    SettingType.SURFACE_NAME,
    SettingType.TIME_OR_INTERVAL,
] as const;
type StatisticalSurfaceSettings = typeof statisicalSurfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<StatisticalSurfaceSettings>;

type Data = SurfaceDataFloat_trans | SurfaceDataPng_api;

export class StatisticalSurfaceLayer implements CustomDataLayerImplementation<StatisticalSurfaceSettings, Data> {
    settings = statisicalSurfaceSettings;

    getDefaultSettingsValues() {
        return {
            [SettingType.ENSEMBLE]: null,
            [SettingType.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api.MEAN,
            [SettingType.SENSITIVITY]: null,
            [SettingType.ATTRIBUTE]: null,
            [SettingType.SURFACE_NAME]: null,
            [SettingType.TIME_OR_INTERVAL]: null,
        };
    }

    getDefaultName(): string {
        return "Statistical Surface";
    }

    getColoringType(): LayerColoringType {
        return LayerColoringType.COLORSCALE;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox({ getData }: DataLayerInformationAccessors<SettingsWithTypes, Data>): BoundingBox | null {
        const data = getData();
        if (!data) {
            return null;
        }

        return {
            x: [data.transformed_bbox_utm.min_x, data.transformed_bbox_utm.max_x],
            y: [data.transformed_bbox_utm.min_y, data.transformed_bbox_utm.max_y],
            z: [0, 0],
        };
    }

    makeValueRange({ getData }: DataLayerInformationAccessors<SettingsWithTypes, Data>): [number, number] | null {
        const data = getData();
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
    }: DefineDependenciesArgs<StatisticalSurfaceSettings, SettingsWithTypes>) {
        availableSettingsUpdater(SettingType.STATISTIC_FUNCTION, () => Object.values(SurfaceStatisticFunction_api));
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });
        availableSettingsUpdater(SettingType.SENSITIVITY, ({ getLocalSetting }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

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
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

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

        availableSettingsUpdater(SettingType.ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(surfaceMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(new Set(data.surfaces.map((surface) => surface.attribute_name))),
            ];

            return availableAttributes;
        });
        availableSettingsUpdater(SettingType.SURFACE_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const attribute = getLocalSetting(SettingType.ATTRIBUTE);
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

        availableSettingsUpdater(SettingType.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const attribute = getLocalSetting(SettingType.ATTRIBUTE);
            const surfaceName = getLocalSetting(SettingType.SURFACE_NAME);
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
    }: FetchDataParams<SettingsWithTypes, Data>): Promise<SurfaceDataFloat_trans | SurfaceDataPng_api> {
        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();

        const ensembleIdent = getSetting(SettingType.ENSEMBLE);
        const surfaceName = getSetting(SettingType.SURFACE_NAME);
        const attribute = getSetting(SettingType.ATTRIBUTE);
        const timeOrInterval = getSetting(SettingType.TIME_OR_INTERVAL);
        const statisticFunction = getSetting(SettingType.STATISTIC_FUNCTION);
        const sensitivityNameCasePair = getSetting(SettingType.SENSITIVITY);

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
                data_format: "png",
                resample_to_def_str: null,
            },
        });

        registerQueryKey(queryOptions.queryKey);

        const promise = queryClient
            .fetchQuery({
                ...queryOptions,
            })
            .then((data) => transformSurfaceData(data));

        return promise;
    }
}
