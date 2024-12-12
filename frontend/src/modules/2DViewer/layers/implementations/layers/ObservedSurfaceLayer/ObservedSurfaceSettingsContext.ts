import { SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { SettingType } from "@modules/2DViewer/layers/implementations/settings/settingsTypes";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { cancelPromiseOnAbort } from "@modules/2DViewer/layers/utils";

import { ObservedSurfaceSettings } from "./types";

import { DefineDependenciesArgs, SettingsContext } from "../../../interfaces";
import { EnsembleSetting } from "../../settings/EnsembleSetting";
import { SurfaceAttributeSetting } from "../../settings/SurfaceAttributeSetting";
import { SurfaceNameSetting } from "../../settings/SurfaceNameSetting";
import { TimeOrIntervalSetting } from "../../settings/TimeOrIntervalSetting";

export class ObservedSurfaceSettingsContext implements SettingsContext<ObservedSurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<ObservedSurfaceSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<ObservedSurfaceSettings, keyof ObservedSurfaceSettings>(
            this,
            layerManager,
            {
                [SettingType.ENSEMBLE]: new EnsembleSetting(),
                [SettingType.SURFACE_ATTRIBUTE]: new SurfaceAttributeSetting(),
                [SettingType.SURFACE_NAME]: new SurfaceNameSetting(),
                [SettingType.TIME_OR_INTERVAL]: new TimeOrIntervalSetting(),
            }
        );
    }

    getDelegate(): SettingsContextDelegate<ObservedSurfaceSettings> {
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
    }: DefineDependenciesArgs<ObservedSurfaceSettings>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembleSet = workbenchSession.getEnsembleSet();

            const ensembleIdents = ensembleSet
                .getEnsembleArr()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const observedSurfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                queryKey: ["getObservedSurfacesMetadata", ensembleIdent.getCaseUuid()],
                queryFn: () =>
                    cancelPromiseOnAbort(
                        apiService.surface.getObservedSurfacesMetadata(ensembleIdent.getCaseUuid()),
                        abortSignal
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
        });

        availableSettingsUpdater(SettingType.SURFACE_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(observedSurfaceMetadataDep);

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
            const data = getHelperDependency(observedSurfaceMetadataDep);

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
            const data = getHelperDependency(observedSurfaceMetadataDep);

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
