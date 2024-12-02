import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { LayerManager } from "@modules/Intersection/utils/layers/LayerManager";

import { atom } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import {
    userSelectedCustomIntersectionPolylineIdAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedFieldIdentifierAtom,
    userSelectedWellboreUuidAtom,
} from "./baseAtoms";
import { drilledWellboreHeadersQueryAtom } from "./queryAtoms";

export const filteredEnsembleSetAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const fieldIdentifier = get(userSelectedFieldIdentifierAtom);

    if (fieldIdentifier === null) {
        return ensembleSet;
    }

    return new EnsembleSet(
        ensembleSet.getRegularEnsembleArray().filter((el) => el.getFieldIdentifier() === fieldIdentifier)
    );
});

export const selectedFieldIdentifierAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedFieldIdentifier = get(userSelectedFieldIdentifierAtom);

    if (selectedFieldIdentifier === null) {
        return ensembleSet.getRegularEnsembleArray()[0]?.getFieldIdentifier() || null;
    }

    return selectedFieldIdentifier;
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

export const selectedEnsembleIdentAtom = atom<RegularEnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    if (userSelectedEnsembleIdent === null || !ensembleSet.hasEnsemble(userSelectedEnsembleIdent)) {
        return ensembleSet.getRegularEnsembleArray()[0]?.getIdent() || null;
    }

    return userSelectedEnsembleIdent;
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
            depthReferencePoint: wellboreHeaders.data[0].depthReferencePoint,
            depthReferenceElevation: wellboreHeaders.data[0].depthReferenceElevation,
        };
    }

    return {
        uuid: userSelectedWellboreUuid,
        identifier: userSelectedWellboreHeader.uniqueWellboreIdentifier,
        depthReferencePoint: userSelectedWellboreHeader.depthReferencePoint,
        depthReferenceElevation: userSelectedWellboreHeader.depthReferenceElevation,
    };
});

export const layerManagerAtom = atom((get) => {
    const layerManager = new LayerManager();
    const queryClient = get(queryClientAtom);
    layerManager.setQueryClient(queryClient);

    return layerManager;
});
