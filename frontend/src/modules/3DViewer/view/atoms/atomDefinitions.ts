import { WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalModuleComponentsInterface } from "@framework/UniDirectionalModuleComponentsInterface";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolyline, IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { SettingsToViewInterface } from "@modules/3DViewer/interfaces";
import { UseQueryResult } from "@tanstack/react-query";

import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

export type ViewAtoms = {
    fieldWellboreTrajectoriesQueryAtom: UseQueryResult<WellboreTrajectory_api[], Error>;
    intersectionReferenceSystemAtom: IntersectionReferenceSystem | null;
    selectedCustomIntersectionPolylineAtom: IntersectionPolyline | null;
    editCustomIntersectionPolylineEditModeActiveAtom: boolean;
};

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function viewAtomsInitialization(
    settingsToViewInterface: UniDirectionalModuleComponentsInterface<SettingsToViewInterface>
): ModuleAtoms<ViewAtoms> {
    const fieldWellboreTrajectoriesQueryAtom = atomWithQuery((get) => {
        const ensembleIdent = get(settingsToViewInterface.getAtom("ensembleIdent"));
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

    const intersectionReferenceSystemAtom = atom((get) => {
        const fieldWellboreTrajectories = get(fieldWellboreTrajectoriesQueryAtom);
        const wellboreUuid = get(settingsToViewInterface.getAtom("highlightedWellboreUuid"));
        const customIntersectionPolylines = get(IntersectionPolylinesAtom);
        const customIntersectionPolylineId = get(settingsToViewInterface.getAtom("customIntersectionPolylineId"));

        const customIntersectionPolyline = customIntersectionPolylines.find(
            (el) => el.id === customIntersectionPolylineId
        );

        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));

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

    const selectedCustomIntersectionPolylineAtom = atom((get) => {
        const customIntersectionPolylineId = get(settingsToViewInterface.getAtom("customIntersectionPolylineId"));
        const customIntersectionPolylines = get(IntersectionPolylinesAtom);

        return customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId) ?? null;
    });

    const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);

    return {
        fieldWellboreTrajectoriesQueryAtom,
        intersectionReferenceSystemAtom,
        selectedCustomIntersectionPolylineAtom,
        editCustomIntersectionPolylineEditModeActiveAtom,
    };
}
