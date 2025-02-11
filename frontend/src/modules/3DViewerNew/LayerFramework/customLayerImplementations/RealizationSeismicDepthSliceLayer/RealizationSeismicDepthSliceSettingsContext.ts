import { getSeismicCubeMetaListOptions } from "@api";
import { SettingsContextDelegate } from "@modules/_shared/LayerFramework/delegates/SettingsContextDelegate";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { DefineDependenciesArgs, SettingsContext } from "@modules/_shared/LayerFramework/interfaces";
import { AttributeSetting } from "@modules/_shared/LayerFramework/settings/implementations/AttributeSetting";
import { EnsembleSetting } from "@modules/_shared/LayerFramework/settings/implementations/EnsembleSetting";
import { RealizationSetting } from "@modules/_shared/LayerFramework/settings/implementations/RealizationSetting";
import { SeismicDepthSliceSetting } from "@modules/_shared/LayerFramework/settings/implementations/SeismicDepthSliceSetting";
import { TimeOrIntervalSetting } from "@modules/_shared/LayerFramework/settings/implementations/TimeOrIntervalSetting";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { RealizationSeismicDepthSliceSettings } from "./types";

export class RealizationSeismicDepthSliceSettingsContext
    implements SettingsContext<RealizationSeismicDepthSliceSettings>
{
    private _contextDelegate: SettingsContextDelegate<RealizationSeismicDepthSliceSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<RealizationSeismicDepthSliceSettings>(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.REALIZATION]: new RealizationSetting(),
            [SettingType.ATTRIBUTE]: new AttributeSetting(),
            [SettingType.TIME_OR_INTERVAL]: new TimeOrIntervalSetting(),
            [SettingType.SEISMIC_DEPTH_SLICE]: new SeismicDepthSliceSetting(),
        });
    }

    areCurrentSettingsValid(settings: RealizationSeismicDepthSliceSettings): boolean {
        return (
            settings[SettingType.ENSEMBLE] !== null &&
            settings[SettingType.REALIZATION] !== null &&
            settings[SettingType.ATTRIBUTE] !== null &&
            settings[SettingType.TIME_OR_INTERVAL] !== null
        );
    }

    getDelegate(): SettingsContextDelegate<RealizationSeismicDepthSliceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationSeismicDepthSliceSettings>) {
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
        const RealizationSeismicDepthSliceDataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
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
            const data = getHelperDependency(RealizationSeismicDepthSliceDataDep);

            if (!data) {
                return [];
            }

            const availableSeismicAttributes = [
                ...Array.from(new Set(data.map((seismicInfos) => seismicInfos.seismicAttribute))),
            ];

            return availableSeismicAttributes;
        });

        availableSettingsUpdater(SettingType.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(SettingType.ATTRIBUTE);

            const data = getHelperDependency(RealizationSeismicDepthSliceDataDep);

            if (!seismicAttribute || !data) {
                return [];
            }

            const availableTimeOrIntervals = [
                ...Array.from(
                    new Set(
                        data
                            .filter((surface) => surface.seismicAttribute === seismicAttribute)
                            .map((el) => el.isoDateOrInterval)
                    )
                ),
            ];

            return availableTimeOrIntervals;
        });
        availableSettingsUpdater(SettingType.SEISMIC_DEPTH_SLICE, ({ getLocalSetting, getHelperDependency }) => {
            const seismicAttribute = getLocalSetting(SettingType.ATTRIBUTE);
            const timeOrInterval = getLocalSetting(SettingType.TIME_OR_INTERVAL);
            const data = getHelperDependency(RealizationSeismicDepthSliceDataDep);

            if (!seismicAttribute || !timeOrInterval || !data) {
                return [];
            }
            const seismicInfo = data.filter(
                (seismicInfos) =>
                    seismicInfos.seismicAttribute === seismicAttribute &&
                    seismicInfos.isoDateOrInterval === timeOrInterval
            )[0];
            const zMin = seismicInfo.spec.zOrigin;
            const zMax =
                seismicInfo.spec.zOrigin +
                seismicInfo.spec.zInc * seismicInfo.spec.zFlip * (seismicInfo.spec.numLayers - 1);
            const zInc = seismicInfo.spec.zInc;

            return [zMin, zMax, zInc];
        });
    }
}
