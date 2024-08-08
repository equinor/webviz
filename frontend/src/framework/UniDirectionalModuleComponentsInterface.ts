import { Atom, Getter, atom, useAtomValue } from "jotai";

export type InterfaceBaseType = Record<string, unknown>;
export type InterfaceInitialization<T extends InterfaceBaseType> = {
    [K in keyof T]: (get: Getter) => T[K];
};

export class UniDirectionalModuleComponentsInterface<TInterfaceType extends InterfaceBaseType> {
    private _atoms: Map<keyof TInterfaceType, Atom<TInterfaceType[keyof TInterfaceType]>> = new Map();

    constructor(initialization: InterfaceInitialization<TInterfaceType>) {
        for (const key in initialization) {
            const value = initialization[key];
            this._atoms.set(
                key,
                atom((get) => value(get))
            );
        }
    }

    getAtom<T extends keyof TInterfaceType>(key: T): Atom<TInterfaceType[T]> {
        const atom = this._atoms.get(key);
        if (atom) {
            return atom as Atom<TInterfaceType[T]>;
        }

        throw new Error(`Atom for key '${String(key)}' not found`);
    }
}

export function useInterfaceValue<InterfaceType extends InterfaceBaseType, K extends keyof InterfaceType>(
    interfaceInstance: UniDirectionalModuleComponentsInterface<InterfaceType>,
    key: K
): InterfaceType[K] {
    return useAtomValue(interfaceInstance.getAtom(key));
}
