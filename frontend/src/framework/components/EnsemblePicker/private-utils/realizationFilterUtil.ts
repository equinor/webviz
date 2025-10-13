import { isEqual } from "lodash-es";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";

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
