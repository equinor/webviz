import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";

import { atom } from "jotai";

export const layerManagerAtom = atom<LayerManager | null>(null);

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);

export const userSelectedWellPickColumnAtom = atom<string | null>(null);
export const userSelectedWellPickInterpreterAtom = atom<string | null>(null);
export const userSelectedWellPicksAtom = atom<string[]>([]);
