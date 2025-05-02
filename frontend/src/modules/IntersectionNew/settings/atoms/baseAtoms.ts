import { atom } from "jotai";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { PreferredViewLayout } from "@modules/IntersectionNew/typesAndEnums";


export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const dataProviderManagerAtom = atom<DataProviderManager | null>(null);
export const preferredViewLayoutAtom = atom<PreferredViewLayout>(PreferredViewLayout.VERTICAL);
