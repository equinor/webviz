import { isEqual } from "lodash-es";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";

/**
 * Check if ensemble has an effective realization filter applied.
 *
 * Returns true if the provided ensemble has an effective realization filter applied,
 * i.e., if the filter function excludes some realizations from the original ensemble realizations.
 *
 * @param ensemble The ensemble to check.
 * @param ensembleRealizationFilterFunction The realization filter function to apply.
 * @returns True if the filter function excludes some realizations of the original ensemble realization array, false otherwise.
 */
export function isEnsembleRealizationFilterEffective(
    ensemble: RegularEnsemble | DeltaEnsemble | null,
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction,
): boolean {
    if (!ensemble || !ensembleRealizationFilterFunction) {
        return false;
    }

    const ensembleRealizations = [...ensemble.getRealizations()].toSorted();
    const filteredRealizations = [...ensembleRealizationFilterFunction(ensemble.getIdent())].toSorted();
    return !isEqual(filteredRealizations, ensembleRealizations);
}
