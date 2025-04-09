import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

import { atom } from "jotai";

export const providerManagerAtom = atom<DataProviderManager | null>(null);

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);

export const userSelectedWellPickColumnAtom = atom<string | null>(null);
export const userSelectedWellPickInterpreterAtom = atom<string | null>(null);
export const userSelectedWellPicksAtom = atom<string[]>([]);
