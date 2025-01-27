import { getSeismicCubeMetaListOptions } from "@api";
import { SettingsContextDelegate } from "@modules/_shared/LayerFramework/delegates/SettingsContextDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { DefineDependenciesArgs, SettingsContext } from "@modules/_shared/LayerFramework/interfaces";
import { AttributeSetting } from "@modules/_shared/LayerFramework/settings/implementations/AttributeSetting";
import { EnsembleSetting } from "@modules/_shared/LayerFramework/settings/implementations/EnsembleSetting";
import { RealizationSetting } from "@modules/_shared/LayerFramework/settings/implementations/RealizationSetting";
import { SeismicCrosslineSetting } from "@modules/_shared/LayerFramework/settings/implementations/SeismicCrosslineSetting";
import { TimeOrIntervalSetting } from "@modules/_shared/LayerFramework/settings/implementations/TimeOrIntervalSetting";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { RealizationSeismicCrosslineSettings } from "./types";

export class RealizationSeismicCrosslineSettingsContext
    implements SettingsContext<RealizationSeismicCrosslineSettings>
{
    private _contextDelegate: SettingsContextDelegate<RealizationSeismicCrosslineSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationSeismicCrosslineSettings,
            keyof RealizationSeismicCrosslineSettings
        >(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.REALIZATION]: new RealizationSetting(),
            [SettingType.ATTRIBUTE]: new AttributeSetting(),
            [SettingType.TIME_OR_INTERVAL]: new TimeOrIntervalSetting(),
            [SettingType.SEISMIC_CROSSLINE]: new SeismicCrosslineSetting(),
        });
    }

    areCurrentSettingsValid(settings: RealizationSeismicCrosslineSettings): boolean {
        return (
            settings[SettingType.ENSEMBLE] !== null &&
            settings[SettingType.REALIZATION] !== null &&
            settings[SettingType.ATTRIBUTE] !== null &&
            settings[SettingType.TIME_OR_INTERVAL] !== null
        );
    }

    getDelegate(): SettingsContextDelegate<RealizationSeismicCrosslineSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationSeismicCrosslineSettings>) {
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
        const realizationSeismicCrosslineDataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
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

        availableSettingsUpdater(SettingType.ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

            if (!data) {
                return [];
            }

            const availableSeismicAttributes = [
                ...Array.from(new Set(data.map((seismicInfos) => seismicInfos.seismic_attribute))),
            ];

            return availableSeismicAttributes;
        });

        availableSettingsUpdater(SettingType.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(SettingType.ATTRIBUTE);

            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

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
        availableSettingsUpdater(SettingType.SEISMIC_CROSSLINE, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(SettingType.ATTRIBUTE);
            const timeOrInterval = getLocalSetting(SettingType.TIME_OR_INTERVAL);
            const data = getHelperDependency(realizationSeismicCrosslineDataDep);

            if (!seismicAttribute || !timeOrInterval || !data) {
                return [];
            }
            const seismicInfo = data.filter(
                (seismicInfos) =>
                    seismicInfos.seismic_attribute === seismicAttribute &&
                    seismicInfos.iso_date_or_interval === timeOrInterval
            )[0];
            const jMin = seismicInfo.j_min;
            const jMax = seismicInfo.j_max;

            return [jMin, jMax];
        });
    }
}
