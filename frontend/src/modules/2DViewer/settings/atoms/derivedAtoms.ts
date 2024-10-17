import { EnsembleSet } from "@framework/EnsembleSet";
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

export const filteredEnsembleSetAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const fieldIdentifier = get(userSelectedFieldIdentifierAtom);

    if (fieldIdentifier === null) {
        return ensembleSet;
    }

    return new EnsembleSet(ensembleSet.getEnsembleArr().filter((el) => el.getFieldIdentifier() === fieldIdentifier));
});
