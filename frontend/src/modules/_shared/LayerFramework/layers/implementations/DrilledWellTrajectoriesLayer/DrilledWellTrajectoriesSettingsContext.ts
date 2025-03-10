import { getDrilledWellboreHeadersOptions } from "@api";
import { SettingsContextDelegate } from "@modules/_shared/LayerFramework/delegates/SettingsContextDelegate";
import type { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import type { DefineDependenciesArgs, SettingsContext } from "@modules/_shared/LayerFramework/interfaces";
import { DrilledWellboresSetting } from "@modules/_shared/LayerFramework/settings/implementations/DrilledWellboresSetting";
import { EnsembleSetting } from "@modules/_shared/LayerFramework/settings/implementations/EnsembleSetting";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import type { DrilledWellTrajectoriesSettings } from "./types";

export class DrilledWellTrajectoriesSettingsContext implements SettingsContext<DrilledWellTrajectoriesSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellTrajectoriesSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<DrilledWellTrajectoriesSettings>(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.SMDA_WELLBORE_HEADERS]: new DrilledWellboresSetting(),
        });
    }

    getDelegate(): SettingsContextDelegate<DrilledWellTrajectoriesSettings> {
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
    }: DefineDependenciesArgs<DrilledWellTrajectoriesSettings>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const fieldIdentifier = ensemble.getFieldIdentifier();

            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier },
                    signal: abortSignal,
                }),
            });
        });
        availableSettingsUpdater(SettingType.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });
    }
}
