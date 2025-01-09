import { SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { LayerManager } from "@modules/2DViewer/layers/framework/LayerManager/LayerManager";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/layers/_utils/queryConstants";
import { cancelPromiseOnAbort } from "@modules/2DViewer/layers/layers/_utils/utils";
import { SettingType } from "@modules/2DViewer/layers/settings/settingsTypes";

import { RealizationSurfaceSettings } from "./types";

import { DefineDependenciesArgs, SettingsContext } from "../../../interfaces";
import { EnsembleSetting } from "../../../settings/implementations/EnsembleSetting";
import { RealizationSetting } from "../../../settings/implementations/RealizationSetting";
import { SurfaceAttributeSetting } from "../../../settings/implementations/SurfaceAttributeSetting";
import { SurfaceNameSetting } from "../../../settings/implementations/SurfaceNameSetting";
import { TimeOrIntervalSetting } from "../../../settings/implementations/TimeOrIntervalSetting";

export class RealizationSurfaceSettingsContext implements SettingsContext<RealizationSurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationSurfaceSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationSurfaceSettings,
            keyof RealizationSurfaceSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.REALIZATION]: new RealizationSetting(),
            [SettingType.SURFACE_ATTRIBUTE]: new SurfaceAttributeSetting(),
            [SettingType.SURFACE_NAME]: new SurfaceNameSetting(),
            [SettingType.TIME_OR_INTERVAL]: new TimeOrIntervalSetting(),
        });
    }

    getDelegate(): SettingsContextDelegate<RealizationSurfaceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationSurfaceSettings>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(SettingType.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);

            return [...realizations];
        });

        const realizationSurfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
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
            const data = getHelperDependency(realizationSurfaceMetadataDep);

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
            const data = getHelperDependency(realizationSurfaceMetadataDep);

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
            const data = getHelperDependency(realizationSurfaceMetadataDep);

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
