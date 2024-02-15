import { Atom, Getter, PrimitiveAtom, atom, useAtom, useAtomValue } from "jotai";

export type InterfaceBaseType = {
    baseStates: Record<string, unknown>;
    derivedStates: Record<string, unknown>;
};

export type InterfaceDefinition<T extends InterfaceBaseType> = {
    baseStates: {
        [K in keyof T["baseStates"]]: T["baseStates"][K];
    };
    derivedStates: {
        [K in keyof T["derivedStates"]]: (get: Getter) => T["derivedStates"][K];
    };
};

export class UniDirectionalSettingsToViewInterface<InterfaceType extends InterfaceBaseType> {
    private _baseAtoms: Map<
        keyof InterfaceType["baseStates"],
        PrimitiveAtom<InterfaceType["baseStates"][keyof InterfaceType["baseStates"]]>
    > = new Map();
    private _derivedAtoms: Map<
        keyof InterfaceType["derivedStates"],
        Atom<InterfaceType["derivedStates"][keyof InterfaceType["derivedStates"]]>
    > = new Map();

    constructor(definition: InterfaceDefinition<InterfaceType>) {
        for (const key in definition.baseStates) {
            const value = definition.baseStates[key];
            this._baseAtoms.set(key, atom(value as InterfaceType["baseStates"][keyof InterfaceType["baseStates"]]));
        }

        for (const key in definition.derivedStates) {
            const value = definition.derivedStates[key];
            this._derivedAtoms.set(
                key,
                atom((get) => value(get))
            );
        }
    }

    getAtom<T extends keyof InterfaceType["baseStates"]>(key: T): Atom<InterfaceType["baseStates"][T]>;
    getAtom<T extends keyof InterfaceType["derivedStates"]>(key: T): Atom<InterfaceType["derivedStates"][T]> {
        const derivedAtom = this._derivedAtoms.get(key);
        if (derivedAtom) {
            return derivedAtom as Atom<InterfaceType["derivedStates"][T]>;
        }

        const baseAtom = this._baseAtoms.get(key);
        if (baseAtom) {
            return baseAtom as PrimitiveAtom<InterfaceType[T]>;
        }

        throw new Error(`Atom for key ${String(key)} not found`);
    }

    getBaseAtom<T extends keyof InterfaceType["baseStates"]>(key: T): PrimitiveAtom<InterfaceType["baseStates"][T]> {
        const baseAtom = this._baseAtoms.get(key);
        if (baseAtom) {
            return baseAtom as PrimitiveAtom<InterfaceType["baseStates"][T]>;
        }

        throw new Error(`Atom for key ${String(key)} not found`);
    }
}

export function useInterfaceState<InterfaceType extends InterfaceBaseType, K extends keyof InterfaceType["baseStates"]>(
    interfaceInstance: UniDirectionalSettingsToViewInterface<InterfaceType>,
    key: K
): [Awaited<InterfaceType["baseStates"][K]>, (value: InterfaceType["baseStates"][K]) => void] {
    const [value, set] = useAtom(interfaceInstance.getBaseAtom(key));

    return [
        value,
        (value: InterfaceType["baseStates"][K]) => {
            set(value);
        },
    ];
}

export function useInterfaceValue<InterfaceType extends InterfaceBaseType, K extends keyof InterfaceType["baseStates"]>(
    interfaceInstance: UniDirectionalSettingsToViewInterface<InterfaceType>,
    key: K
): InterfaceType["baseStates"][K];
export function useInterfaceValue<
    InterfaceType extends InterfaceBaseType,
    K extends keyof InterfaceType["derivedStates"]
>(interfaceInstance: UniDirectionalSettingsToViewInterface<InterfaceType>, key: K): InterfaceType["derivedStates"][K];
export function useInterfaceValue<
    InterfaceType extends InterfaceBaseType,
    K extends keyof InterfaceType["baseStates"] | keyof InterfaceType["derivedStates"]
>(
    interfaceInstance: UniDirectionalSettingsToViewInterface<InterfaceType>,
    key: K
): InterfaceType["baseStates"][K] | InterfaceType["derivedStates"][K] {
    return useAtomValue(interfaceInstance.getAtom(key));
}

export function useSetInterfaceValue<
    InterfaceType extends InterfaceBaseType,
    K extends keyof InterfaceType["baseStates"]
>(
    interfaceInstance: UniDirectionalSettingsToViewInterface<InterfaceType>,
    key: K
): (value: InterfaceType["baseStates"][K]) => void {
    const [, set] = useAtom(interfaceInstance.getBaseAtom(key));

    return (value: InterfaceType["baseStates"][K]) => {
        set(value);
    };
}
