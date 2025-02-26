import { PreferredViewLayout } from "@modules/2DViewer/types";
import { DataLayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/DataLayerManager";

import { atom } from "jotai";

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const layerManagerAtom = atom<DataLayerManager | null>(null);
export const preferredViewLayoutAtom = atom<PreferredViewLayout>(PreferredViewLayout.VERTICAL);
