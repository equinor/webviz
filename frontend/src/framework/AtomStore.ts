/**
 * Why are we disbling rules-of-hooks here?
 *
 * Well, we are using several hooks in this class, which is not allowed by this rule.
 * However, we are not using these hooks in a component, but in a utility class.
 * The important thing to remember is that these functions must be called on every render,
 * unconditionally (i.e. not in a conditional statement) and not in a loop.
 * This is exactly what we are doing here. We are only using the class to group the functions together
 * and give additional context to the functions.
 */

/* eslint-disable react-hooks/rules-of-hooks */
import {
    Atom,
    ExtractAtomArgs,
    ExtractAtomResult,
    ExtractAtomValue,
    PrimitiveAtom,
    WritableAtom,
    createStore,
    useAtom,
    useAtomValue,
} from "jotai";

export type AtomDefinition = {
    name: string;
    atom: Atom<unknown> | WritableAtom<unknown, any[], unknown> | PrimitiveAtom<unknown>;
};

export type AtomStoreAtoms = Record<string, Atom<unknown>>;

export type Options = Parameters<typeof useAtomValue>[1];
export type SetAtom<Args extends any[], Result> = (...args: Args) => Result;

export class AtomStore {
    protected _store: ReturnType<typeof createStore> = createStore();
    protected _atoms: Map<Atom<unknown>, string> = new Map();
    private _internalStore: Map<string, unknown> = new Map();

    constructor(atomDefinitions: AtomDefinition[]) {
        this._atoms = new Map();

        for (const { name, atom } of atomDefinitions) {
            this._atoms.set(atom, name);
            this._store.sub(atom, () => {
                this._internalStore.set(name, this._store.get(atom));
            });
        }
    }

    useStoredAtom<Value, Args extends any[], Result>(
        atom: WritableAtom<Value, Args, Result>,
        options?: Options
    ): [Awaited<Value>, SetAtom<Args, Result>];
    useStoredAtom<Value>(atom: Atom<Value>, options?: Options): [Awaited<Value>, never];
    useStoredAtom<AtomType extends WritableAtom<any, any[], any>>(
        atom: AtomType,
        options?: Options
    ): [Awaited<ExtractAtomValue<AtomType>>, SetAtom<ExtractAtomArgs<AtomType>, ExtractAtomResult<AtomType>>];
    useStoredAtom<AtomType extends Atom<any>>(
        atom: AtomType,
        options?: Options
    ): [Awaited<ExtractAtomValue<AtomType>>, never] {
        const name = this._atoms.get(atom);

        if (!name) {
            throw new Error(`Atom '${atom.debugLabel}' not found in AtomStore. Did you forget to register it?`);
        }

        return useAtom(atom, options);
    }
}

export function useStoredAtom<Value, Args extends any[], Result>(
    store: AtomStore,
    atom: WritableAtom<Value, Args, Result>,
    options?: Options
): [Awaited<Value>, SetAtom<Args, Result>];
export function useStoredAtom<Value>(store: AtomStore, atom: Atom<Value>, options?: Options): [Awaited<Value>, never];
export function useStoredAtom<AtomType extends WritableAtom<any, any[], any>>(
    store: AtomStore,
    atom: AtomType,
    options?: Options
): [Awaited<ExtractAtomValue<AtomType>>, SetAtom<ExtractAtomArgs<AtomType>, ExtractAtomResult<AtomType>>];
export function useStoredAtom<AtomType extends Atom<any>>(
    store: AtomStore,
    atom: AtomType,
    options?: Options
): [Awaited<ExtractAtomValue<AtomType>>, never] {
    return store.useStoredAtom(atom, options);
}
