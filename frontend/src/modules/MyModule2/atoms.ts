import { apiService } from "@framework/ApiService";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

export const textAtom = atom<string>("I am an atom with text!");
export const selectedEnsembleAtom = atom<RegularEnsembleIdent | null>(null);
export const vectorsAtom = atomWithQuery((get) => ({
    queryKey: ["ensembles", get(selectedEnsembleAtom)?.toString()],
    queryFn: () =>
        apiService.timeseries.getVectorList(
            get(selectedEnsembleAtom)?.getCaseUuid() ?? "",
            get(selectedEnsembleAtom)?.getEnsembleName() ?? ""
        ),
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

export const ensembleSetDependentAtom = atom<RegularEnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const firstEnsemble = ensembleSet.getRegularEnsembleArray()[0];
    return firstEnsemble?.getIdent() ?? null;
});
