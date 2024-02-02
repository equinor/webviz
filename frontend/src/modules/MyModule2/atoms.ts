import { VectorDescription_api } from "@api";
import { apiService } from "@framework/ApiService";
import { AtomDefinition } from "@framework/AtomStore";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { QueryClient } from "@tanstack/react-query";

import { Atom, Getter, atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { atomFamily } from "jotai/utils";
import { AtomFamily } from "jotai/vanilla/utils/atomFamily";

// This approach seems the easiest one
// Advantage: less code, more direct Jotai, no wrapping, stores are only creating states for atoms that are in use

export const a = atom<EnsembleIdent | null>((get) => {
    return get(selectedEnsembleAtom);
});
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

export const atomDefinitions: AtomDefinition[] = [
    { name: "selectedEnsemble", atom: selectedEnsembleAtom },
    { name: "vectors", atom: vectorsAtom },
    { name: "atomBasedOnVectors", atom: atomBasedOnVectors },
    { name: "userSelectedVector", atom: userSelectedVectorAtom },
    { name: "selectedVector", atom: selectedVectorAtom },
    { name: "firstEnsemble", atom: ensembleSetDependentAtom },
];

// This is how we could make use of atomFamily without any additional code
// Advantage: less code, more direct Jotai, no wrapping
// Disadvantage: no control over where atoms are used, more complicated to use since we need to pass moduleInstanceId

const selectedEnsembleSetAtomFamily = atomFamily(
    (moduleInstanceId: string) => {
        return atom<EnsembleIdent | null>(null);
    },
    (a, b) => a === b
);

const vectorsAtomFamily = atomFamily((moduleInstanceId: string) => {
    return atomWithQuery((get) => ({
        queryKey: ["ensembles", get(selectedEnsembleSetAtomFamily(moduleInstanceId))?.toString()],
        queryFn: () =>
            apiService.timeseries.getVectorList(
                get(selectedEnsembleSetAtomFamily(moduleInstanceId))?.getCaseUuid() ?? "",
                get(selectedEnsembleSetAtomFamily(moduleInstanceId))?.getEnsembleName() ?? ""
            ),
    }));
});

// This is how we could make use of atomFamily with additional code and more control
// Advantage: more control over where atoms are used, less complicated to use since we don't need to pass moduleInstanceId
// Disadvantage: more code, wrapping around Jotai

type AtomBluePrint<T, S> =
    | T
    | ((get: AtomStoreGetter<S>) => T)
    | ((get: AtomStoreGetter<S>, queryClient: QueryClient) => T);
type AtomStoreGetter<S> = <T extends keyof S>(name: T) => S[T];
type AtomDefs<S, T extends keyof S> = Record<T, AtomBluePrint<S[T], S>>;

class AtomStore<AtomTypes extends Record<string, any>> {
    private _atomNames: string[] = [];
    private _atomFamilies: Map<string, AtomFamily<any, any>> = new Map();
    private _queryClient: QueryClient = new QueryClient();

    constructor(atomDefinitions: AtomDefs<AtomTypes, keyof AtomTypes>) {
        Object.entries(atomDefinitions).forEach(([name]) => {
            this._atomNames.push(name);
            this.registerAtom(name, atomDefinitions[name]);
        });
    }

    private get(moduleInstanceId: string): <T extends keyof AtomTypes>(name: T) => AtomTypes[T] {
        return (name: keyof AtomTypes) => {
            const family = this._atomFamilies.get(name as string);
            if (!family) {
                throw new Error(`Atom ${name as string} not found`);
            }
            return family(moduleInstanceId);
        };
    }

    private registerAtom<T extends keyof AtomTypes>(name: T, bluePrint: AtomBluePrint<AtomTypes[T], AtomTypes>): void {
        const newAtomFamily = atomFamily((moduleInstanceId: string) => {
            if (bluePrint instanceof Function) {
                return bluePrint(this.get(moduleInstanceId), this._queryClient);
            }
            return bluePrint;
        });
        this._atomFamilies.set(name as string, newAtomFamily);
    }

    makeAtoms(moduleInstanceId: string): void {
        this._atomNames.forEach((name) => {
            const family = this._atomFamilies.get(name);
            if (!family) {
                throw new Error(`Atom ${name} not found`);
            }
            family(moduleInstanceId);
        });
    }

    getAtom<T extends keyof AtomTypes>(moduleInstanceId: string, name: T): Atom<AtomTypes[T]> {
        const family = this._atomFamilies.get(name as string);
        if (!family) {
            throw new Error(`Atom ${name as string} not found`);
        }
        return family(moduleInstanceId);
    }
}

type Defs = {
    selectedEnsembleIdent: EnsembleIdent | null;
    test2: number;
    vectors: Promise<VectorDescription_api[]>;
};

const defs: AtomDefs<Defs, keyof Defs> = {
    selectedEnsembleIdent: null,
    test2: (get: AtomStoreGetter<Defs>) => {
        return get("selectedEnsembleIdent")?.getEnsembleName().length ?? 0;
    },
    vectors: (get, queryClient) =>
        queryClient.fetchQuery({
            queryKey: ["ensembles", get("selectedEnsembleIdent")?.toString()],
            queryFn: () =>
                apiService.timeseries.getVectorList(
                    get("selectedEnsembleIdent")?.getCaseUuid() ?? "",
                    get("selectedEnsembleIdent")?.getEnsembleName() ?? ""
                ),
        }),
};

const atomStore = new AtomStore<Defs>(defs);

atomStore.makeAtoms("test");
console.debug(atomStore.getAtom("test", "selectedEnsembleIdent"));
console.debug(atomStore.getAtom("test", "test2"));
console.debug(atomStore.getAtom("test", "vectors"));
