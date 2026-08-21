import { atom } from "jotai";

export const sizeMbAtom = atom<number>(50);
export const storeInAtomStoreAtom = atom<boolean>(false);
export const storeInQueryCacheAtom = atom<boolean>(false);
export const storeInSettingsStateAtom = atom<boolean>(false);
export const storeInViewStateAtom = atom<boolean>(false);

// Written to from the view - lets us observe whether data placed directly in the per-instance
// atom store survives module instance teardown.
export const atomStoreDummyDataAtom = atom<Float64Array | null>(null);
