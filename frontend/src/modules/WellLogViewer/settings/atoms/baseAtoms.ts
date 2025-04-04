import type { DataLayerManager } from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";

import { atom } from "jotai";

export const layerManagerAtom = atom<DataLayerManager | null>(null);

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);

export const userSelectedWellPickColumnAtom = atom<string | null>(null);
export const userSelectedWellPickInterpreterAtom = atom<string | null>(null);
export const userSelectedWellPicksAtom = atom<string[]>([]);
