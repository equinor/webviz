import { Atom, Getter, PrimitiveAtom, atom, useAtom, useAtomValue } from "jotai";

export type InterfaceBaseType = {
    baseStates: Record<string, unknown>;
    derivedStates: Record<string, unknown>;
};

export type InterfaceInitialization<T extends InterfaceBaseType> = {
    baseStates: {
        [K in keyof T["baseStates"]]: T["baseStates"][K];
    };
    derivedStates: {
        [K in keyof T["derivedStates"]]: (get: Getter) => T["derivedStates"][K];
    };
};

export class UniDirectionalSettingsToViewInterface<TInterfaceType extends InterfaceBaseType> {
    private _baseAtoms: Map<
        keyof TInterfaceType["baseStates"],
        PrimitiveAtom<TInterfaceType["baseStates"][keyof TInterfaceType["baseStates"]]>
    > = new Map();
    private _derivedAtoms: Map<
        keyof TInterfaceType["derivedStates"],
        Atom<TInterfaceType["derivedStates"][keyof TInterfaceType["derivedStates"]]>
    > = new Map();

    constructor(initialization: InterfaceInitialization<TInterfaceType>) {
        for (const key in initialization.baseStates) {
            const value = initialization.baseStates[key];
            this._baseAtoms.set(key, atom(value as TInterfaceType["baseStates"][keyof TInterfaceType["baseStates"]]));
        }

        for (const key in initialization.derivedStates) {
            const value = initialization.derivedStates[key];
            this._derivedAtoms.set(
                key,
                atom((get) => value(get))
            );
        }
    }

    getAtom<T extends keyof TInterfaceType["baseStates"]>(key: T): PrimitiveAtom<TInterfaceType["baseStates"][T]>;
    getAtom<T extends keyof TInterfaceType["derivedStates"]>(key: T): Atom<TInterfaceType["derivedStates"][T]> {
        const derivedAtom = this._derivedAtoms.get(key);
        if (derivedAtom) {
            return derivedAtom as Atom<TInterfaceType["derivedStates"][T]>;
        }

        const baseAtom = this._baseAtoms.get(key);
        if (baseAtom) {
            return baseAtom as PrimitiveAtom<TInterfaceType["baseStates"][T]>;
        }

        throw new Error(`Atom for key '${String(key)}' not found`);
    }
}

export function useSettingsToViewInterfaceState<
    TInterfaceType extends InterfaceBaseType,
    TKey extends keyof TInterfaceType["baseStates"]
>(
    interfaceInstance: UniDirectionalSettingsToViewInterface<TInterfaceType>,
    key: TKey
): [Awaited<TInterfaceType["baseStates"][TKey]>, (value: TInterfaceType["baseStates"][TKey]) => void] {
    const [value, set] = useAtom(interfaceInstance.getAtom(key));

    return [
        value,
        (value: TInterfaceType["baseStates"][TKey]) => {
            set(value);
        },
    ];
}

export function useSettingsToViewInterfaceValue<
    TInterfaceType extends InterfaceBaseType,
    TKey extends keyof TInterfaceType["baseStates"]
>(
    interfaceInstance: UniDirectionalSettingsToViewInterface<TInterfaceType>,
    key: TKey
): TInterfaceType["baseStates"][TKey];
export function useSettingsToViewInterfaceValue<
    InterfaceType extends InterfaceBaseType,
    K extends keyof InterfaceType["derivedStates"]
>(interfaceInstance: UniDirectionalSettingsToViewInterface<InterfaceType>, key: K): InterfaceType["derivedStates"][K];
export function useSettingsToViewInterfaceValue<
    InterfaceType extends InterfaceBaseType,
    K extends keyof InterfaceType["baseStates"] | keyof InterfaceType["derivedStates"]
>(
    interfaceInstance: UniDirectionalSettingsToViewInterface<InterfaceType>,
    key: K
): InterfaceType["baseStates"][K] | InterfaceType["derivedStates"][K] {
    return useAtomValue(interfaceInstance.getAtom(key));
}

export function useSetSettingsToViewInterfaceValue<
    TInterfaceType extends InterfaceBaseType,
    TKey extends keyof TInterfaceType["baseStates"]
>(
    interfaceInstance: UniDirectionalSettingsToViewInterface<TInterfaceType>,
    key: TKey
): (value: TInterfaceType["baseStates"][TKey]) => void {
    const [, set] = useAtom(interfaceInstance.getAtom(key));

    return (value: TInterfaceType["baseStates"][TKey]) => {
        set(value);
    };
}
