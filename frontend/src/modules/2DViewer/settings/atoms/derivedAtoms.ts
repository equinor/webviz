import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import { userSelectedFieldIdentifierAtom } from "./baseAtoms";

export const selectedFieldIdentifierAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedField = get(userSelectedFieldIdentifierAtom);

    if (
        !userSelectedField ||
        !ensembleSet.getEnsembleArr().some((ens) => ens.getFieldIdentifier() === userSelectedField)
    ) {
        return ensembleSet.getEnsembleArr().at(0)?.getFieldIdentifier() ?? null;
    }

    return userSelectedField;
});
