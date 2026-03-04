import { atom } from "jotai";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { ViewLayout } from "@modules/_shared/enums/viewLayout";

export const dataProviderManagerAtom = atom<DataProviderManager | null>(null);
export const preferredViewLayoutAtom = atom<ViewLayout>(ViewLayout.VERTICAL);
export const dataProviderSerializedStateAtom = atom<string>("");
