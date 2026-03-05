import { SurfaceStatisticFunction_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { UpdateFuncWithNoUpdate } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type {
    MakeSettingTypesMap,
    SettingsKeysFromTuple,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import type { SensitivityNameCasePair } from "@modules/_shared/DataProviderFramework/settings/implementations/SensitivitySetting";
import type { Settings } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

/**
 * Returns ensemble idents filtered by the given field identifier.
 */
export function createEnsembleUpdater<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
>(): UpdateFuncWithNoUpdate<RegularEnsembleIdent[], TSettings, TSettingTypes, TKey> {
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
 * Returns sensitivity name/case pairs for the selected ensemble.
 */
export function createSensitivityUpdater<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
>(
    workbenchSession: WorkbenchSession,
): UpdateFuncWithNoUpdate<SensitivityNameCasePair[], TSettings, TSettingTypes, TKey> {
    return ({ getLocalSetting }) => {
        const ensembleIdent = getLocalSetting(Setting.ENSEMBLE as TKey) as
            | RegularEnsembleIdent
            | DeltaEnsembleIdent
            | null;

    const currentEnsemble = workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent);
    const sensitivities = currentEnsemble?.getSensitivities()?.getSensitivityArr() ?? [];
    if (sensitivities.length === 0) {
        return [];
    }

    return sensitivities.flatMap((sensitivity) =>
        sensitivity.cases.map((sensitivityCase) => ({
            sensitivityName: sensitivity.name,
            sensitivityCase: sensitivityCase.name,
        })),
    );
}

/**
 * Returns filtered realizations for the selected ensemble.
 */
export function createRealizationUpdater<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
>(): UpdateFuncWithNoUpdate<number[], TSettings, TSettingTypes, TKey> {
    return ({ getLocalSetting, getGlobalSetting }) => {
        const ensembleIdent = getLocalSetting(Setting.ENSEMBLE as TKey) as
            | RegularEnsembleIdent
            | DeltaEnsembleIdent
            | null;
        const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

    return [...realizationFilterFunction(ensembleIdent)];
}

/**
 * Returns all available surface statistic functions.
 */
export function resolveStatisticFunctionConstraints(): SurfaceStatisticFunction_api[] {
    return Object.values(SurfaceStatisticFunction_api);
}
