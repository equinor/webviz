import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { atomWithModuleInstanceStorage, clearModuleInstanceStorage } from "@framework/utils/atomUtils";

import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

export const textAtom = atom<string>("I am an atom with text!");
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

export const ensembleSetDependentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const firstEnsemble = ensembleSet.getEnsembleArr()[0];
    return firstEnsemble?.getIdent() ?? null;
});

export const persistentTextSettingAtom = atomWithModuleInstanceStorage<string>("myPersistentValue", "");
export function cleanUpInstanceAtomStorage(instanceId: string) {
    clearModuleInstanceStorage(instanceId, "myPersistentValue");
}
