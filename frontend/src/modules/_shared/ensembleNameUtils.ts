import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export function makeDistinguishableEnsembleDisplayName(
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
    allEnsembles: readonly (RegularEnsemble | DeltaEnsemble)[]
): string {
    const ensemble = allEnsembles.find((ensemble) => ensemble.getIdent().equals(ensembleIdent));

    if (!ensemble) {
        return ensembleIdent.getEnsembleName();
    }

    const customName = ensemble.getCustomName();
    if (customName) {
        return customName;
    }

    const ensembleNameCount = allEnsembles.filter(
        (elm) => elm.getEnsembleName() === ensembleIdent.getEnsembleName()
    ).length;
    if (ensembleNameCount === 1) {
        return ensembleIdent.getEnsembleName();
    }

    return ensemble.getDisplayName();
}
