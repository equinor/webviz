import { atom } from "jotai";

import type { WellboreHeader_api } from "@api";

import { selectedWellboreUuidAtom } from "./persistableFixableAtoms";
import { drilledWellboreHeadersQueryAtom } from "./queryAtoms";

export const selectedWellboreHeaderAtom = atom<WellboreHeader_api | null>((get) => {
    const availableWellboreHeaders = get(drilledWellboreHeadersQueryAtom)?.data ?? [];
    const selectedWellboreId = get(selectedWellboreUuidAtom).value;

    if (!selectedWellboreId) return null;

    return availableWellboreHeaders.find((wh) => wh.wellboreUuid === selectedWellboreId) ?? null;
});
