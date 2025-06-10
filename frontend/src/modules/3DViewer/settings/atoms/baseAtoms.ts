import { atom } from "jotai";

import { PreferredViewLayout } from "@modules/3DViewer/types";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const dataProviderManagerAtom = atom<DataProviderManager | null>(null);
export const preferredViewLayoutAtom = atom<PreferredViewLayout>(PreferredViewLayout.VERTICAL);
