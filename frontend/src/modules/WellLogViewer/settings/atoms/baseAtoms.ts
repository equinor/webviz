import { atom } from "jotai";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

export const providerManagerAtom = atom<DataProviderManager | null>(null);
