import { SurfaceStatisticFunction_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { Sensitivity, SensitivityCase } from "@framework/EnsembleSensitivities";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { UpdateFunc } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type {
    MakeSettingTypesMap,
    SettingsKeysFromTuple,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import type { SensitivityNameCasePair } from "@modules/_shared/DataProviderFramework/settings/implementations/SensitivitySetting";
import type { Settings } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

/**
 * Creates an valueConstraintsUpdater for Setting.ENSEMBLE that filters ensembles by the current field.
 */
export function createEnsembleUpdater<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
>(): UpdateFunc<RegularEnsembleIdent[], TSettings, TSettingTypes, TKey> {
    return ({ getGlobalSetting }) => {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const ensembles = getGlobalSetting("ensembles");

        const ensembleIdents = ensembles
            .filter((ensemble: any) => ensemble.getFieldIdentifier() === fieldIdentifier)
            .map((ensemble: any) => ensemble.getIdent());

        return ensembleIdents;
    };
}

/**
 * Creates an valueConstraintsUpdater for Setting.SENSITIVITY that returns sensitivity name/case pairs
 * for the selected ensemble.
 */
export function createSensitivityUpdater<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
>(workbenchSession: WorkbenchSession): UpdateFunc<SensitivityNameCasePair[], TSettings, TSettingTypes, TKey> {
    return ({ getLocalSetting }) => {
        const ensembleIdent = getLocalSetting(Setting.ENSEMBLE as TKey) as
            | RegularEnsembleIdent
            | DeltaEnsembleIdent
            | null;

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
 * Creates an valueConstraintsUpdater for Setting.REALIZATION that returns filtered realizations
 * for the selected ensemble.
 */
export function createRealizationUpdater<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
>(): UpdateFunc<number[], TSettings, TSettingTypes, TKey> {
    return ({ getLocalSetting, getGlobalSetting }) => {
        const ensembleIdent = getLocalSetting(Setting.ENSEMBLE as TKey) as
            | RegularEnsembleIdent
            | DeltaEnsembleIdent
            | null;
        const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

        if (!ensembleIdent) {
            return [];
        }

        const realizations = realizationFilterFunc(ensembleIdent);

        return [...realizations];
    };
}

/**
 * Creates an valueConstraintsUpdater for Setting.STATISTIC_FUNCTION that returns all available
 * surface statistic functions.
 */
export function createStatisticFunctionUpdater() {
    return () => Object.values(SurfaceStatisticFunction_api);
}
