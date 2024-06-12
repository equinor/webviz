import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";

import { atom } from "jotai";

import {
    userSelectedCustomIntersectionPolylineIdAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedHighlightedWellboreUuidAtom,
} from "../settings/atoms/baseAtoms";
import { drilledWellboreHeadersQueryAtom } from "../settings/atoms/queryAtoms";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    if (userSelectedEnsembleIdent === null || !ensembleSet.hasEnsemble(userSelectedEnsembleIdent)) {
        return ensembleSet.getEnsembleArr()[0]?.getIdent() || null;
    }

    return userSelectedEnsembleIdent;
});

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
        return wellboreHeaders.data[0].wellboreUuid ?? null;
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
