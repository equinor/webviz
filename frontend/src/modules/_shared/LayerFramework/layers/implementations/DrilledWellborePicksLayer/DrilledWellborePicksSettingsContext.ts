import { getDrilledWellboreHeadersOptions, getWellborePickIdentifiersOptions } from "@api";
import { SettingsContextDelegate } from "@modules/_shared/LayerFramework/delegates/SettingsContextDelegate";
import type { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import type { DefineDependenciesArgs, SettingsContext } from "@modules/_shared/LayerFramework/interfaces";
import { DrilledWellboresSetting } from "@modules/_shared/LayerFramework/settings/implementations/DrilledWellboresSetting";
import { EnsembleSetting } from "@modules/_shared/LayerFramework/settings/implementations/EnsembleSetting";
import { SurfaceNameSetting } from "@modules/_shared/LayerFramework/settings/implementations/SurfaceNameSetting";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import type { DrilledWellborePicksSettings } from "./types";

export class DrilledWellborePicksSettingsContext implements SettingsContext<DrilledWellborePicksSettings> {
    private _contextDelegate: SettingsContextDelegate<DrilledWellborePicksSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<DrilledWellborePicksSettings>(this, layerManager, {
            [SettingType.ENSEMBLE]: new EnsembleSetting(),
            [SettingType.SMDA_WELLBORE_HEADERS]: new DrilledWellboresSetting(),
            [SettingType.SURFACE_NAME]: new SurfaceNameSetting(),
        });
    }

    getDelegate(): SettingsContextDelegate<DrilledWellborePicksSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    areCurrentSettingsValid(settings: DrilledWellborePicksSettings): boolean {
        return (
            settings[SettingType.ENSEMBLE] !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS] !== null &&
            settings[SettingType.SMDA_WELLBORE_HEADERS].length > 0 &&
            settings[SettingType.SURFACE_NAME] !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellborePicksSettings>) {
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

        const pickIdentifiersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const stratColumnIdentifier = ensemble.getStratigraphicColumnIdentifier();

            return await queryClient.fetchQuery({
                ...getWellborePickIdentifiersOptions({
                    query: { strat_column_identifier: stratColumnIdentifier },
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

        availableSettingsUpdater(SettingType.SURFACE_NAME, ({ getHelperDependency }) => {
            const pickIdentifiers = getHelperDependency(pickIdentifiersDep);

            if (!pickIdentifiers) {
                return [];
            }

            return pickIdentifiers;
        });
    }
}
