import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";


import { userSelectedFieldIdentifierAtom } from "./baseAtoms";

export const selectedFieldIdentifierAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedField = get(userSelectedFieldIdentifierAtom);

    if (
        !userSelectedField ||
        !ensembleSet.getRegularEnsembleArray().some((ens) => ens.getFieldIdentifier() === userSelectedField)
    ) {
        return ensembleSet.getRegularEnsembleArray().at(0)?.getFieldIdentifier() ?? null;
    }

    return userSelectedField;
});
