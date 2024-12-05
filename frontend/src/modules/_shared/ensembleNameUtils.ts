import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export function makeDistinguishableEnsembleDisplayName(
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
    allEnsembles: readonly (RegularEnsemble | DeltaEnsemble)[]
): string {
    const ensemble = allEnsembles.find((ensemble) => ensemble.getIdent().equals(ensembleIdent));

    if (ensemble) {
        const customName = ensemble.getCustomName();
        if (customName) {
            return customName;
        }
    }

    const ensembleNameCount = allEnsembles.filter(
        (ensemble) => ensemble.getEnsembleName() === ensembleIdent.getEnsembleName()
    ).length;
    if (ensembleNameCount === 1) {
        return ensembleIdent.getEnsembleName();
    }

    if (!ensemble) {
        return ensembleIdent.getEnsembleName();
    }

    return ensemble.getDisplayName();
}
