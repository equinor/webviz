import { LayerManager } from "@modules/2DViewer/layers/LayerManager";

import { atom } from "jotai";

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const layerManagerAtom = atom<LayerManager | null>(null);
