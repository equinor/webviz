import { atom } from "jotai";

import { PreferredViewLayout } from "@modules/2DViewer/types";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

export const dataProviderManagerAtom = atom<DataProviderManager | null>(null);
export const preferredViewLayoutAtom = atom<PreferredViewLayout>(PreferredViewLayout.VERTICAL);
export const dataProviderStateAtom = atom<string>("");
