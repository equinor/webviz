import { atom } from "jotai";

import type { WellboreHeader_api } from "@api";

import { userSelectedFieldIdentAtom, userSelectedWellboreUuidAtom } from "./persistedAtoms";
import { availableFieldsQueryAtom, drilledWellboreHeadersQueryAtom } from "./queryAtoms";

export const selectedFieldIdentifierAtom = atom((get) => {
    const availableFields = get(availableFieldsQueryAtom).data ?? [];
    const selectedFieldId = get(userSelectedFieldIdentAtom);

    // Fixup selected field id
    if (!availableFields.length) return null;
    const selectionIsValid = availableFields.some((field) => field.fieldIdentifier === selectedFieldId);
    return selectionIsValid ? selectedFieldId : availableFields[0].fieldIdentifier;
});

export const selectedWellboreHeaderAtom = atom<WellboreHeader_api | null>((get) => {
    const availableWellboreHeaders = get(drilledWellboreHeadersQueryAtom)?.data;
    const selectedWellboreId = get(userSelectedWellboreUuidAtom);

    if (!availableWellboreHeaders?.length) {
        return null;
    }

    return availableWellboreHeaders.find((wh) => wh.wellboreUuid === selectedWellboreId) ?? availableWellboreHeaders[0];
});
