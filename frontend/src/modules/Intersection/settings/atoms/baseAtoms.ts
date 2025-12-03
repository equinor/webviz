import { atom } from "jotai";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { PreferredViewLayout } from "@modules/Intersection/typesAndEnums";

export const dataProviderManagerAtom = atom<DataProviderManager | null>(null);
export const preferredViewLayoutAtom = atom<PreferredViewLayout>(PreferredViewLayout.VERTICAL);
export const dataProviderSerializedStateAtom = atom<string>("");
