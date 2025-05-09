import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

import { getVectorListOptions } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";


export const textAtom = atom<string>("I am an atom with text!");
export const selectedEnsembleAtom = atom<RegularEnsembleIdent | null>(null);
export const vectorsAtom = atomWithQuery((get) => ({
    ...getVectorListOptions({
        query: {
            case_uuid: get(selectedEnsembleAtom)?.getCaseUuid() ?? "",
            ensemble_name: get(selectedEnsembleAtom)?.getEnsembleName() ?? "",
        },
    }),
}));
export const atomBasedOnVectors = atom<boolean>((get) => get(vectorsAtom).isFetching);
export const userSelectedVectorAtom = atom<string | null>(null);
export const selectedVectorAtom = atom<string | null>((get) => {
    const vectors = get(vectorsAtom);
    const userSelectedVector = get(userSelectedVectorAtom);

    if (userSelectedVector && vectors.data) {
        if (vectors.data.some((vector) => vector.name === userSelectedVector)) {
            return userSelectedVector;
        }
    }

    return vectors.data?.at(0)?.name ?? null;
});

export const ensembleSetDependentAtom = atom<RegularEnsembleIdent | DeltaEnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const firstEnsemble = ensembleSet.getEnsembleArray()[0];
    return firstEnsemble?.getIdent() ?? null;
});
