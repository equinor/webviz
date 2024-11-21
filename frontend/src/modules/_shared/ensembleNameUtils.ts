import { EnsembleIdentInterface } from "@framework/EnsembleIdentInterface";
import { EnsembleInterface } from "@framework/EnsembleInterface";

export function makeDistinguishableEnsembleDisplayName(
    ensembleIdent: EnsembleIdentInterface<any>,
    allEnsembles: readonly EnsembleInterface[]
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
