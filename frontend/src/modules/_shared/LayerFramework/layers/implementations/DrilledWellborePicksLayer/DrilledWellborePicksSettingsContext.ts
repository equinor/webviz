import { getDrilledWellboreHeadersOptions, getWellborePickIdentifiersOptions } from "@api";
import {
    CustomSettingsContextImplementation,
    DefineDependenciesArgs,
} from "@modules/_shared/LayerFramework/interfaces";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { DrilledWellborePicksSettings } from "./settingsTypes";

export class DrilledWellborePicksSettingsContext
    implements CustomSettingsContextImplementation<DrilledWellborePicksSettings>
{
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
