import { SurfaceStatisticFunction_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { Sensitivity, SensitivityCase } from "@framework/EnsembleSensitivities";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { SensitivityNameCasePair } from "@modules/_shared/DataProviderFramework/settings/implementations/SensitivitySetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

/**
 * Creates an availableSettingsUpdater for Setting.ENSEMBLE that filters ensembles by the current field.
 */
export function createEnsembleUpdater() {
    return ({ getGlobalSetting }: any) => {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const ensembles = getGlobalSetting("ensembles");

        const ensembleIdents = ensembles
            .filter((ensemble: any) => ensemble.getFieldIdentifier() === fieldIdentifier)
            .map((ensemble: any) => ensemble.getIdent());

        return ensembleIdents;
    };
}

/**
 * Creates an availableSettingsUpdater for Setting.SENSITIVITY that returns sensitivity name/case pairs
 * for the selected ensemble.
 */
export function createSensitivityUpdater(workbenchSession: WorkbenchSession) {
    return ({ getLocalSetting }: any) => {
        const ensembleIdent = getLocalSetting(Setting.ENSEMBLE) as RegularEnsembleIdent | DeltaEnsembleIdent | null;

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
        sensitivities.map((sensitivity: Sensitivity) =>
            sensitivity.cases.map((sensitivityCase: SensitivityCase) => {
                availableSensitivityPairs.push({
                    sensitivityName: sensitivity.name,
                    sensitivityCase: sensitivityCase.name,
                });
            }),
        );
        return availableSensitivityPairs;
    };
}

/**
 * Creates an availableSettingsUpdater for Setting.REALIZATION that returns filtered realizations
 * for the selected ensemble.
 */
export function createRealizationUpdater() {
    return ({ getLocalSetting, getGlobalSetting }: any) => {
        const ensembleIdent = getLocalSetting(Setting.ENSEMBLE) as RegularEnsembleIdent | DeltaEnsembleIdent | null;
        const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

        if (!ensembleIdent) {
            return [];
        }

        const realizations = realizationFilterFunc(ensembleIdent);

        return [...realizations];
    };
}

/**
 * Creates an availableSettingsUpdater for Setting.STATISTIC_FUNCTION that returns all available
 * surface statistic functions.
 */
export function createStatisticFunctionUpdater() {
    return () => Object.values(SurfaceStatisticFunction_api);
}
