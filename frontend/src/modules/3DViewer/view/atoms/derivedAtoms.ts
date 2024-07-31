import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";

import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

import {
    customIntersectionPolylineIdAtom,
    ensembleIdentAtom,
    highlightedWellboreUuidAtom,
    intersectionTypeAtom,
} from "./baseAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const fieldWellboreTrajectoriesQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(ensembleIdentAtom);
    const ensembleSet = get(EnsembleSetAtom);

    let fieldIdentifier: string | null = null;
    if (ensembleIdent) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            fieldIdentifier = ensemble.getFieldIdentifier();
        }
    }

    return {
        queryKey: ["getFieldWellboreTrajectories", fieldIdentifier ?? ""],
        queryFn: () => apiService.well.getFieldWellTrajectories(fieldIdentifier ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(fieldIdentifier),
    };
});

export const intersectionReferenceSystemAtom = atom((get) => {
    const fieldWellboreTrajectories = get(fieldWellboreTrajectoriesQueryAtom);
    const wellboreUuid = get(highlightedWellboreUuidAtom);
    const customIntersectionPolylines = get(IntersectionPolylinesAtom);
    const customIntersectionPolylineId = get(customIntersectionPolylineIdAtom);

    const customIntersectionPolyline = customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId);

    const intersectionType = get(intersectionTypeAtom);

    if (intersectionType === IntersectionType.WELLBORE) {
        if (!fieldWellboreTrajectories.data || !wellboreUuid) {
            return null;
        }

        const wellboreTrajectory = fieldWellboreTrajectories.data.find(
            (wellbore) => wellbore.wellboreUuid === wellboreUuid
        );

        if (wellboreTrajectory) {
            const path: number[][] = [];
            for (const [index, northing] of wellboreTrajectory.northingArr.entries()) {
                const easting = wellboreTrajectory.eastingArr[index];
                const tvd_msl = wellboreTrajectory.tvdMslArr[index];

                path.push([easting, northing, tvd_msl]);
            }
            const offset = wellboreTrajectory.tvdMslArr[0];

            const referenceSystem = new IntersectionReferenceSystem(path);
            referenceSystem.offset = offset;

            return referenceSystem;
        }
    } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && customIntersectionPolyline) {
        if (customIntersectionPolyline.points.length < 2) {
            return null;
        }
        const referenceSystem = new IntersectionReferenceSystem(
            customIntersectionPolyline.points.map((point) => [point[0], point[1], 0])
        );
        referenceSystem.offset = 0;

        return referenceSystem;
    }

    return null;
});

export const selectedCustomIntersectionPolylineAtom = atom((get) => {
    const customIntersectionPolylineId = get(customIntersectionPolylineIdAtom);
    const customIntersectionPolylines = get(IntersectionPolylinesAtom);

    return customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId) ?? null;
});
