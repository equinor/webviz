import { getWellTrajectoriesOptions } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

import { ensembleIdentAtom } from "./baseAtoms";

export const fieldWellboreTrajectoriesQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(ensembleIdentAtom);
    const ensembleSet = get(EnsembleSetAtom);

    let fieldIdentifier: string | null = null;
    if (ensembleIdent) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            fieldIdentifier = ensemble.getFieldIdentifier();
        }
    }

    return {
        ...getWellTrajectoriesOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
            },
        }),
        enabled: Boolean(fieldIdentifier),
    };
});
