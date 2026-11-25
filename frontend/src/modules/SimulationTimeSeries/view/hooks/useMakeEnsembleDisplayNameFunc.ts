import { useAtomValue } from "jotai";

import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { selectedEnsemblesAtom } from "../atoms/derivedAtoms";

export function useMakeEnsembleDisplayNameFunc(): (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string {
    const selectedEnsembles = useAtomValue(selectedEnsemblesAtom);

    return function makeEnsembleDisplayName(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): string {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, selectedEnsembles);
    };
}
