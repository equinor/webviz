import { atom } from "jotai";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

export const horizontalLayoutAtom = atom(false);
export const limitDomainToDataAtom = atom(false);
export const dataProviderManagerAtom = atom<DataProviderManager | null>(null);
export const dataProviderStateAtom = atom<string>("");
