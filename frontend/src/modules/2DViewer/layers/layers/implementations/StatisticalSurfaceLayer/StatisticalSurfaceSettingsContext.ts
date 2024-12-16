import { SurfaceStatisticFunction_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/framework/LayerManager/LayerManager";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/layers/_utils/queryConstants";
import { cancelPromiseOnAbort } from "@modules/2DViewer/layers/layers/_utils/utils";

import { StatisticalSurfaceSettings } from "./types";

import { SettingsContextDelegate } from "../../../delegates/SettingsContextDelegate";
import { DefineDependenciesArgs, SettingsContext } from "../../../interfaces";
import { EnsembleSetting } from "../../../settings/implementations/EnsembleSetting";
import { SensitivityNameCasePair, SensitivitySetting } from "../../../settings/implementations/SensitivitySetting";
import { StatisticFunctionSetting } from "../../../settings/implementations/StatisticFunctionSetting";
import { SurfaceAttributeSetting } from "../../../settings/implementations/SurfaceAttributeSetting";
import { SurfaceNameSetting } from "../../../settings/implementations/SurfaceNameSetting";
import { TimeOrIntervalSetting } from "../../../settings/implementations/TimeOrIntervalSetting";
import { SettingType } from "../../../settings/settingsTypes";

export class StatisticalSurfaceSettingsContext implements SettingsContext<StatisticalSurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<StatisticalSurfaceSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            StatisticalSurfaceSettings,
            keyof StatisticalSurfaceSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.STATISTIC_FUNCTION]: new StatisticFunctionSetting(),
            [SettingType.SENSITIVITY]: new SensitivitySetting(),
            [SettingType.SURFACE_ATTRIBUTE]: new SurfaceAttributeSetting(),
            [SettingType.SURFACE_NAME]: new SurfaceNameSetting(),
            [SettingType.TIME_OR_INTERVAL]: new TimeOrIntervalSetting(),
        });
    }

    getDelegate(): SettingsContextDelegate<StatisticalSurfaceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<StatisticalSurfaceSettings>) {
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
                queryKey: ["getRealizationSurfacesMetadata", ensembleIdent],
                queryFn: () =>
                    cancelPromiseOnAbort(
                        apiService.surface.getRealizationSurfacesMetadata(
                            ensembleIdent.getCaseUuid(),
                            ensembleIdent.getEnsembleName()
                        ),
                        abortSignal
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
        });

        availableSettingsUpdater(SettingType.SURFACE_ATTRIBUTE, ({ getHelperDependency }) => {
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
            const attribute = getLocalSetting(SettingType.SURFACE_ATTRIBUTE);
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
            const attribute = getLocalSetting(SettingType.SURFACE_ATTRIBUTE);
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
}
