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

    const userSelectedWellboreHeader = wellboreHeaders.data.find((el) => el.wellbore_uuid === userSelectedWellboreUuid);

    if (!userSelectedWellboreUuid || !userSelectedWellboreHeader) {
        if (wellboreHeaders.data.length === 0) {
            return null;
        }
        return {
            uuid: wellboreHeaders.data[0].wellbore_uuid,
            identifier: wellboreHeaders.data[0].unique_wellbore_identifier,
        };
    }

    return {
        uuid: userSelectedWellboreUuid,
        identifier: userSelectedWellboreHeader.unique_wellbore_identifier,
        depthReferencePoint: userSelectedWellboreHeader.depth_reference_point,
        depthReferenceElevation: userSelectedWellboreHeader.depth_reference_elevation,
    };
});

export const addCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);

export const currentCustomIntersectionPolylineAtom = atom<number[][]>([]);
