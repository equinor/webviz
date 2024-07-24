import { Grid3dDimensions_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { GridCellIndexRanges } from "@modules/3DViewer/typesAndEnums";

import { atom } from "jotai";

import {
    userSelectedCustomIntersectionPolylineIdAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedGridCellIndexRangesAtom,
    userSelectedGridModelNameAtom,
    userSelectedGridModelParameterDateOrIntervalAtom,
    userSelectedGridModelParameterNameAtom,
    userSelectedHighlightedWellboreUuidAtom,
    userSelectedRealizationAtom,
    userSelectedWellboreUuidsAtom,
} from "./baseAtoms";
import { drilledWellboreHeadersQueryAtom, gridModelInfosQueryAtom } from "./queryAtoms";

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
        return wellboreHeaders.data[0]?.wellboreUuid ?? null;
    }

    return userSelectedHighlightedWellboreUuid;
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

export const selectedRealizationAtom = atom((get) => {
    const realizations = get(availableRealizationsAtom);
    const userSelectedRealization = get(userSelectedRealizationAtom);

    if (userSelectedRealization === null || !realizations.includes(userSelectedRealization)) {
        return realizations.at(0) ?? null;
    }

    return userSelectedRealization;
});

export const selectedWellboreUuidsAtom = atom((get) => {
    const userSelectedWellboreUuids = get(userSelectedWellboreUuidsAtom);
    const wellboreHeaders = get(drilledWellboreHeadersQueryAtom);

    if (!wellboreHeaders.data) {
        return [];
    }

    return userSelectedWellboreUuids.filter((uuid) => wellboreHeaders.data.some((el) => el.wellboreUuid === uuid));
});
export const selectedGridModelNameAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const userSelectedGridModelName = get(userSelectedGridModelNameAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (
        userSelectedGridModelName === null ||
        !gridModelInfos.data.map((gridModelInfo) => gridModelInfo.grid_name).includes(userSelectedGridModelName)
    ) {
        return gridModelInfos.data[0]?.grid_name || null;
    }

    return userSelectedGridModelName;
});

export const gridModelDimensionsAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const selectedGridModelName = get(selectedGridModelNameAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (!selectedGridModelName) {
        return null;
    }

    return (
        gridModelInfos.data.find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)?.dimensions ??
        null
    );
});

export const selectedGridModelBoundingBox3dAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const selectedGridModelName = get(selectedGridModelNameAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (!selectedGridModelName) {
        return null;
    }

    return gridModelInfos.data.find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)?.bbox ?? null;
});

export const selectedGridModelParameterNameAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const userSelectedGridModelParameterName = get(userSelectedGridModelParameterNameAtom);
    const selectedGridModelName = get(selectedGridModelNameAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (!selectedGridModelName) {
        return null;
    }

    if (
        userSelectedGridModelParameterName === null ||
        !gridModelInfos.data
            .find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)
            ?.property_info_arr.some(
                (propertyInfo) => propertyInfo.property_name === userSelectedGridModelParameterName
            )
    ) {
        return (
            gridModelInfos.data.find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)
                ?.property_info_arr[0]?.property_name || null
        );
    }

    return userSelectedGridModelParameterName;
});

export const selectedGridModelParameterDateOrIntervalAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const selectedGridModelParameterName = get(selectedGridModelParameterNameAtom);
    const selectedGridModelName = get(selectedGridModelNameAtom);
    const userSelectedGridModelParameterDateOrInterval = get(userSelectedGridModelParameterDateOrIntervalAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (!selectedGridModelName || !selectedGridModelParameterName) {
        return null;
    }

    if (
        userSelectedGridModelParameterDateOrInterval === null ||
        !gridModelInfos.data
            .find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)
            ?.property_info_arr.some(
                (propertyInfo) =>
                    propertyInfo.property_name === selectedGridModelParameterName &&
                    propertyInfo.iso_date_or_interval === userSelectedGridModelParameterDateOrInterval
            )
    ) {
        return (
            gridModelInfos.data
                .find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)
                ?.property_info_arr.find(
                    (propertyInfo) => propertyInfo.property_name === selectedGridModelParameterName
                )?.iso_date_or_interval || null
        );
    }

    return userSelectedGridModelParameterDateOrInterval;
});

export const availableUserCreatedIntersectionPolylinesAtom = atom((get) => {
    const intersectionPolylines = get(IntersectionPolylinesAtom);
    return intersectionPolylines;
});

export const selectedGridCellIndexRangesAtom = atom<GridCellIndexRanges>((get) => {
    const userSelectedGridCellIndexRanges = get(userSelectedGridCellIndexRangesAtom);
    const gridModelDimensions = get(gridModelDimensionsAtom);

    if (!gridModelDimensions && !userSelectedGridCellIndexRanges) {
        return {
            i: [0, 1],
            j: [0, 1],
            k: [0, 1],
        };
    }

    if (!gridModelDimensions && userSelectedGridCellIndexRanges) {
        return userSelectedGridCellIndexRanges;
    }

    if (gridModelDimensions && !userSelectedGridCellIndexRanges) {
        return {
            i: [0, gridModelDimensions.i_count],
            j: [0, gridModelDimensions.j_count],
            k: [0, gridModelDimensions.k_count],
        };
    }

    return assertGridDimensionRangesContainedInGridDimensions(
        userSelectedGridCellIndexRanges as GridCellIndexRanges,
        gridModelDimensions as Grid3dDimensions_api
    );
});

function assertGridDimensionRangesContainedInGridDimensions(
    cellIndexRanges: GridCellIndexRanges,
    other: Grid3dDimensions_api
): GridCellIndexRanges {
    const assertedGridDimensionRanges: GridCellIndexRanges = {
        ...cellIndexRanges,
    };

    if (other.i_count < cellIndexRanges.i[1]) {
        assertedGridDimensionRanges.i[1] = other.i_count;
    }

    if (cellIndexRanges.i[0] > assertedGridDimensionRanges.i[1]) {
        assertedGridDimensionRanges.i[0] = assertedGridDimensionRanges.i[1];
    }

    if (other.j_count < cellIndexRanges.j[1]) {
        assertedGridDimensionRanges.j[1] = other.j_count;
    }

    if (cellIndexRanges.j[0] > assertedGridDimensionRanges.j[1]) {
        assertedGridDimensionRanges.j[0] = assertedGridDimensionRanges.j[1];
    }

    if (other.k_count < cellIndexRanges.k[1]) {
        assertedGridDimensionRanges.k[1] = other.k_count;
    }

    if (cellIndexRanges.k[0] > assertedGridDimensionRanges.k[1]) {
        assertedGridDimensionRanges.k[0] = assertedGridDimensionRanges.k[1];
    }

    return assertedGridDimensionRanges;
}
