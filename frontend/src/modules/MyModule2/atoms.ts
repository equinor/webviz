import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

export const selectedEnsembleAtom = atom<EnsembleIdent | null>(null);
export const vectorsAtom = atomWithQuery((get) => ({
    queryKey: ["ensembles", get(selectedEnsembleAtom)?.toString()],
    queryFn: () =>
        apiService.timeseries.getVectorList(
            get(selectedEnsembleAtom)?.getCaseUuid() ?? "",
            get(selectedEnsembleAtom)?.getEnsembleName() ?? ""
        ),
}));
export const atomBasedOnVectors = atom<boolean>((get) => get(vectorsAtom).isFetching);

export const atoms = [selectedEnsembleAtom, vectorsAtom, atomBasedOnVectors];
