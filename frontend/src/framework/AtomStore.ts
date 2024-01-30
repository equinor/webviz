import { Atom, PrimitiveAtom, WritableAtom, createStore } from "jotai";

export type AtomDefinition = {
    [name: string]: Atom<unknown> | WritableAtom<unknown, any[], unknown> | PrimitiveAtom<unknown>;
};

export type AtomStoreAtoms = Record<string, Atom<unknown>>;

export class AtomStore<S extends AtomDefinition> {
    protected _store: ReturnType<typeof createStore> = createStore();
    protected _atoms: Map<string, Atom<unknown>> = new Map();

    constructor(atomDefinitions: S) {
        this._atoms = new Map(Object.entries(atomDefinitions));
    }

    getAtom<TName extends keyof S>(name: TName): S[TName] {
        const atom = this._atoms.get(name as string);
        if (!atom) {
            throw new Error(`Atom ${name as string} not found`);
        }
        return atom as S[TName];
    }
}
