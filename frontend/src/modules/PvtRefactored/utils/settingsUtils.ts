import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";

export function computeRealizationsIntersection(
    ensembleIdents: EnsembleIdent[],
    filterEnsembleRealizations: EnsembleRealizationFilterFunction
) {
    const realizations = ensembleIdents.map(filterEnsembleRealizations).flat();
    return Array.from(new Set(realizations));
}
