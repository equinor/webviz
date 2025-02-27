import { getPolygonsDirectoryOptions } from "@api";
import { SettingsContextDelegate } from "@modules/_shared/LayerFramework/delegates/SettingsContextDelegate";
import { DataLayerManager } from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import { DefineDependenciesArgs, SettingsContext } from "@modules/_shared/LayerFramework/interfaces";
import { EnsembleSetting } from "@modules/_shared/LayerFramework/settings/implementations/EnsembleSetting";
import { PolygonsAttributeSetting } from "@modules/_shared/LayerFramework/settings/implementations/PolygonsAttributeSetting";
import { PolygonsNameSetting } from "@modules/_shared/LayerFramework/settings/implementations/PolygonsNameSetting";
import { RealizationSetting } from "@modules/_shared/LayerFramework/settings/implementations/RealizationSetting";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { RealizationPolygonsSettings } from "./types";

export class RealizationPolygonsSettingsContext implements SettingsContext<RealizationPolygonsSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationPolygonsSettings>;

    constructor(layerManager: DataLayerManager) {
        this._contextDelegate = new SettingsContextDelegate<RealizationPolygonsSettings>(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.REALIZATION]: new RealizationSetting(),
            [SettingType.POLYGONS_ATTRIBUTE]: new PolygonsAttributeSetting(),
            [SettingType.POLYGONS_NAME]: new PolygonsNameSetting(),
        });
    }

    getDelegate(): SettingsContextDelegate<RealizationPolygonsSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationPolygonsSettings>) {
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

        const realizationPolygonsMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getPolygonsDirectoryOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(SettingType.POLYGONS_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationPolygonsMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(new Set(data.map((polygonsMeta) => polygonsMeta.attribute_name))),
            ];

            return availableAttributes;
        });

        availableSettingsUpdater(SettingType.POLYGONS_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const attribute = getLocalSetting(SettingType.POLYGONS_ATTRIBUTE);
            const data = getHelperDependency(realizationPolygonsMetadataDep);

            if (!attribute || !data) {
                return [];
            }

            const availableSurfaceNames = [
                ...Array.from(
                    new Set(
                        data.filter((polygonsMeta) => polygonsMeta.attribute_name === attribute).map((el) => el.name)
                    )
                ),
            ];

            return availableSurfaceNames;
        });
    }
}
