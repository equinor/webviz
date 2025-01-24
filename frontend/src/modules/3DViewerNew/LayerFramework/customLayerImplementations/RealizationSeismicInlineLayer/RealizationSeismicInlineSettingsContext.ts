import { getGridModelsInfoOptions, getSeismicCubeMetaListOptions } from "@api";
import { SettingsContextDelegate } from "@modules/_shared/LayerFramework/delegates/SettingsContextDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { DefineDependenciesArgs, SettingsContext } from "@modules/_shared/LayerFramework/interfaces";
import { EnsembleSetting } from "@modules/_shared/LayerFramework/settings/implementations/EnsembleSetting";
import { GridAttributeSetting } from "@modules/_shared/LayerFramework/settings/implementations/GridAttributeSetting";
import { GridLayerIRangeSetting } from "@modules/_shared/LayerFramework/settings/implementations/GridLayerIRangeSetting";
import { GridLayerJRangeSetting } from "@modules/_shared/LayerFramework/settings/implementations/GridLayerJRangeSetting";
import { GridLayerKRangeSetting } from "@modules/_shared/LayerFramework/settings/implementations/GridLayerKRangeSetting";
import { GridNameSetting } from "@modules/_shared/LayerFramework/settings/implementations/GridNameSetting";
import { RealizationSetting } from "@modules/_shared/LayerFramework/settings/implementations/RealizationSetting";
import { SeismicAttributeSetting } from "@modules/_shared/LayerFramework/settings/implementations/SeismicAttributeSetting";
import { SeismicInlineSetting } from "@modules/_shared/LayerFramework/settings/implementations/SeismicInlineSetting";
import { ShowGridLinesSetting } from "@modules/_shared/LayerFramework/settings/implementations/ShowGridLinesSetting";
import { TimeOrIntervalSetting } from "@modules/_shared/LayerFramework/settings/implementations/TimeOrIntervalSetting";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { RealizationSeismicInlineSettings } from "./types";

export class RealizationSeismicInlineSettingsContext implements SettingsContext<RealizationSeismicInlineSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationSeismicInlineSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationSeismicInlineSettings,
            keyof RealizationSeismicInlineSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.REALIZATION]: new RealizationSetting(),
            [SettingType.SEISMIC_ATTRIBUTE]: new SeismicAttributeSetting(),

            [SettingType.TIME_OR_INTERVAL]: new TimeOrIntervalSetting(),
            [SettingType.SEISMIC_INLINE]: new SeismicInlineSetting(),
        });
    }

    areCurrentSettingsValid(settings: RealizationSeismicInlineSettings): boolean {
        return (
            settings[SettingType.ENSEMBLE] !== null &&
            settings[SettingType.REALIZATION] !== null &&
            settings[SettingType.SEISMIC_ATTRIBUTE] !== null &&
            settings[SettingType.TIME_OR_INTERVAL] !== null
        );
    }

    getDelegate(): SettingsContextDelegate<RealizationSeismicInlineSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationSeismicInlineSettings>) {
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
        const realizationSeismicInlineDataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);
            const realization = getLocalSetting(SettingType.REALIZATION);

            if (!ensembleIdent || realization === null) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getSeismicCubeMetaListOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(SettingType.SEISMIC_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationSeismicInlineDataDep);

            if (!data) {
                return [];
            }

            const availableSeismicAttributes = [
                ...Array.from(new Set(data.map((seismicInfos) => seismicInfos.seismic_attribute))),
            ];

            return availableSeismicAttributes;
        });

        availableSettingsUpdater(SettingType.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(SettingType.SEISMIC_ATTRIBUTE);

            const data = getHelperDependency(realizationSeismicInlineDataDep);

            if (!seismicAttribute || !data) {
                return [];
            }

            const availableTimeOrIntervals = [
                ...Array.from(
                    new Set(
                        data
                            .filter((surface) => surface.seismic_attribute === seismicAttribute)
                            .map((el) => el.iso_date_or_interval)
                    )
                ),
            ];

            return availableTimeOrIntervals;
        });
        availableSettingsUpdater(SettingType.SEISMIC_INLINE, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(SettingType.SEISMIC_ATTRIBUTE);
            const timeOrInterval = getLocalSetting(SettingType.TIME_OR_INTERVAL);
            const data = getHelperDependency(realizationSeismicInlineDataDep);

            if (!seismicAttribute || !timeOrInterval || !data) {
                return [];
            }
            const seismicInfo = data.filter(
                (seismicInfos) =>
                    seismicInfos.seismic_attribute === seismicAttribute &&
                    seismicInfos.iso_date_or_interval === timeOrInterval
            )[0];
            const iMin = seismicInfo.i_min;
            const iMax = seismicInfo.i_max;

            return [iMin, iMax];
        });
    }
}
