/*
Note that shared atoms is just a temporary solution to a use case that does not have a clear solution yet.
This is not how it should be done properly, communication between settings and view components should be done 
through the use of interfaces.
*/
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";

import { atom } from "jotai";

import {
    userSelectedCustomIntersectionPolylineIdAtom,
    userSelectedHighlightedWellboreUuidAtom,
} from "../settings/atoms/baseAtoms";
import { drilledWellboreHeadersQueryAtom } from "../settings/atoms/queryAtoms";

export const selectedHighlightedWellboreUuidAtom = atom((get) => {
    const userSelectedHighlightedWellboreUuid = get(userSelectedHighlightedWellboreUuidAtom);
    const wellboreHeaders = get(drilledWellboreHeadersQueryAtom);

    if (!wellboreHeaders.data) {
        return null;
    }

    if (
        !userSelectedHighlightedWellboreUuid ||
        !wellboreHeaders.data.some((el) => el.wellboreUuid === userSelectedHighlightedWellboreUuid)
    ) {
        return wellboreHeaders.data[0]?.wellboreUuid ?? null;
    }

    return userSelectedHighlightedWellboreUuid;
});

export const intersectionTypeAtom = atom<IntersectionType>(IntersectionType.WELLBORE);
export const addCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);

export const currentCustomIntersectionPolylineAtom = atom<number[][]>([]);

export const selectedCustomIntersectionPolylineIdAtom = atom((get) => {
    const userSelectedCustomIntersectionPolylineId = get(userSelectedCustomIntersectionPolylineIdAtom);
    const customIntersectionPolylines = get(IntersectionPolylinesAtom);

    if (!customIntersectionPolylines.length) {
        return null;
    }

    if (
        !userSelectedCustomIntersectionPolylineId ||
        !customIntersectionPolylines.some((el) => el.id === userSelectedCustomIntersectionPolylineId)
    ) {
        return customIntersectionPolylines[0].id;
    }

    return userSelectedCustomIntersectionPolylineId;
});
