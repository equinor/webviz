import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { useAtomValue } from "jotai";

import { selectedEnsemblesAtom } from "../atoms";

export function useMakeEnsembleDisplayNameFunc(): (ensembleIdent: EnsembleIdent) => string {
    const selectedEnsembles = useAtomValue(selectedEnsemblesAtom);
    const ensembleSet = useAtomValue(EnsembleSetAtom);

    return function makeEnsembleDisplayName(ensembleIdent: EnsembleIdent) {
        const ensembleNameCount = selectedEnsembles.filter(
            (ensemble) => ensemble.getEnsembleName() === ensembleIdent.getEnsembleName()
        ).length;
        if (ensembleNameCount === 1) {
            return ensembleIdent.getEnsembleName();
        }

        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) {
            return ensembleIdent.getEnsembleName();
        }

        return ensemble.getDisplayName();
    };
}
