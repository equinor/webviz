import { PreferredViewLayout } from "@modules/2DViewer/types";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";

import { atom } from "jotai";

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const layerManagerAtom = atom<LayerManager | null>(null);
export const preferredViewLayoutAtom = atom<PreferredViewLayout>(PreferredViewLayout.VERTICAL);
