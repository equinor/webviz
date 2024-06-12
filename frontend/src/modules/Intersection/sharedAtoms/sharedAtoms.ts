import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import { userSelectedEnsembleIdentAtom, userSelectedWellboreUuidAtom } from "../settings/atoms/baseAtoms";
import { drilledWellboreHeadersQueryAtom } from "../settings/atoms/queryAtoms";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    if (userSelectedEnsembleIdent === null || !ensembleSet.hasEnsemble(userSelectedEnsembleIdent)) {
        return ensembleSet.getEnsembleArr()[0]?.getIdent() || null;
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
        };
    }

    return {
        uuid: userSelectedWellboreUuid,
        identifier: userSelectedWellboreHeader.uniqueWellboreIdentifier,
        depthReferencePoint: userSelectedWellboreHeader.depthReferencePoint,
        depthReferenceElevation: userSelectedWellboreHeader.depthReferenceElevation,
    };
});

export const addCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);

export const currentCustomIntersectionPolylineAtom = atom<number[][]>([]);
