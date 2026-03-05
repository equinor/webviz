import { SurfaceStatisticFunction_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { EnsembleRealizationFilterFunction, WorkbenchSession } from "@framework/WorkbenchSession";
import type { SensitivityNameCasePair } from "@modules/_shared/DataProviderFramework/settings/implementations/SensitivitySetting";

/**
 * Returns ensemble idents filtered by the given field identifier.
 */
export function resolveEnsembleConstraints(
    fieldIdentifier: string | null,
    ensembles: readonly RegularEnsemble[],
): RegularEnsembleIdent[] {
    return ensembles
        .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
        .map((ensemble) => ensemble.getIdent());
}

/**
 * Returns sensitivity name/case pairs for the selected ensemble.
 */
export function resolveSensitivityConstraints(
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null,
    workbenchSession: WorkbenchSession,
): SensitivityNameCasePair[] {
    if (!ensembleIdent) {
        return [];
    }

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
export function resolveRealizationConstraints(
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null,
    realizationFilterFunction: EnsembleRealizationFilterFunction,
): number[] {
    if (!ensembleIdent) {
        return [];
    }

    return [...realizationFilterFunction(ensembleIdent)];
}

/**
 * Returns all available surface statistic functions.
 */
export function resolveStatisticFunctionConstraints(): SurfaceStatisticFunction_api[] {
    return Object.values(SurfaceStatisticFunction_api);
}
