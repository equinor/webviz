import { atom } from "jotai";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { PreferredViewLayout } from "@modules/_shared/components/SubsurfaceViewer/typesAndEnums";

export const dataProviderManagerAtom = atom<DataProviderManager | null>(null);
export const preferredViewLayoutAtom = atom<PreferredViewLayout>(PreferredViewLayout.VERTICAL);
export const dataProviderStateAtom = atom<string>("");
