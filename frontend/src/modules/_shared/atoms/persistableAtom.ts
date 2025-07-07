import { atom, type Getter } from "jotai";

enum Source {
    USER = "user",
    PERSISTED = "persisted",
}

type InternalState<T> = {
    value: T;
    source: Source;
};

function isInternalState<T>(value: T | InternalState<T>): value is InternalState<T> {
    return (value as InternalState<T>).source !== undefined;
}

export function persistableBaseAtom<T>(initialValue: T) {
    const internalStateAtom = atom<InternalState<T>>({
        value: initialValue,
        source: Source.USER,
    });

    const baseAtom = atom(
        (get) => get(internalStateAtom).value,
        (get, set, update: InternalState<T>) => {
            set(internalStateAtom, update);
        },
    );
}

export function persistableFixableAtom<T>(initialValue: T, fixupFunction: (value: T, get: Getter) => T) {
    const internalStateAtom = atom<InternalState<T>>({
        value: initialValue,
        source: Source.USER,
    });

    const baseAtom = atom(
        (get, set) => {
            const internalState = get(internalStateAtom);
            if (internalState.source === Source.PERSISTED) {
                return internalState.value;
            }

            const fixedValue = fixupFunction(internalState.value, get);
            return fixedValue;
        },
        (get, set, update: T | InternalState<T>) => {
            if (isInternalState(update)) {
                // If the update is an InternalState, we set it directly
                set(internalStateAtom, update);
                return;
            }

            // If the update is a value, we create a new InternalState
            const newInternalState: InternalState<T> = {
                value: update,
                source: Source.USER,
            };

            set(internalStateAtom, newInternalState);
        },
    );

    return baseAtom;
}
