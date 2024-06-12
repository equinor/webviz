import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { selectedEnsembleIdentAtom } from "@modules/Intersection/sharedAtoms/sharedAtoms";

import { atom } from "jotai";

import { userSelectedCustomIntersectionPolylineIdAtom, userSelectedWellboreUuidAtom } from "./baseAtoms";
import { drilledWellboreHeadersQueryAtom } from "./queryAtoms";

export const availableRealizationsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);

    if (selectedEnsembleIdent === null) {
        return [];
    }

    let ensembleRealizationFilterFunction = get(EnsembleRealizationFilterFunctionAtom);

    if (ensembleRealizationFilterFunction === null) {
        ensembleRealizationFilterFunction = (ensembleIdent: EnsembleIdent) => {
            return ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];
        };
    }

    return ensembleRealizationFilterFunction(selectedEnsembleIdent);
});

export const availableUserCreatedIntersectionPolylinesAtom = atom((get) => {
    const intersectionPolylines = get(IntersectionPolylinesAtom);
    return intersectionPolylines;
});

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

export const selectedWellboreAtom = atom((get) => {
    const userSelectedWellboreUuid = get(userSelectedWellboreUuidAtom);
    const wellboreHeaders = get(drilledWellboreHeadersQueryAtom);

    if (!wellboreHeaders.data) {
        return null;
    }

    const userSelectedWellboreHeader = wellboreHeaders.data.find((el) => el.wellboreUuid === userSelectedWellboreUuid);

    if (!userSelectedWellboreUuid || !userSelectedWellboreHeader) {
        if (wellboreHeaders.data.length === 0) {
            return null;
        }
        return {
            uuid: wellboreHeaders.data[0].wellboreUuid,
            identifier: wellboreHeaders.data[0].uniqueWellboreIdentifier,
        };
    }

    return {
        uuid: userSelectedWellboreUuid,
        identifier: userSelectedWellboreHeader.uniqueWellboreIdentifier,
    };
});
