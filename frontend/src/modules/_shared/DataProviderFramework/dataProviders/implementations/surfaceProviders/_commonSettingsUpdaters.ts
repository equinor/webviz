import { SurfaceStatisticFunction_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { WorkbenchSession } from "@framework/WorkbenchSession";

export type SensitivityConstraint = {
    sensitivityName: string;
    sensitivityCase: string;
};

/**
 * Returns sensitivity name/case pairs for the selected ensemble.
 */
export function resolveSensitivityConstraints(
    ensembleIdent: RegularEnsembleIdent | null,
    workbenchSession: WorkbenchSession,
): SensitivityConstraint[] {
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
 * Returns all available surface statistic functions.
 */
export function resolveStatisticFunctionConstraints(): SurfaceStatisticFunction_api[] {
    return Object.values(SurfaceStatisticFunction_api);
}
