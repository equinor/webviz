import { WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalSettingsToViewInterface } from "@framework/UniDirectionalSettingsToViewInterface";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { arrayPointToPoint2D, pointDistance } from "@lib/utils/geometry";
import { SettingsToViewInterface } from "@modules/Intersection/settingsToViewInterface";
import { CURVE_FITTING_EPSILON } from "@modules/Intersection/typesAndEnums";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";
import { QueryObserverResult } from "@tanstack/react-query";

import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type ViewAtoms = {
    intersectionReferenceSystemAtom: IntersectionReferenceSystem | null;
    polylineAtom: {
        polylineUtmXy: number[];
        actualSectionLengths: number[];
    };
    wellboreTrajectoryQueryAtom: QueryObserverResult<WellboreTrajectory_api, Error>;
};

export function viewAtomsInitialization(
    settingsToViewInterface: UniDirectionalSettingsToViewInterface<SettingsToViewInterface>
): ModuleAtoms<ViewAtoms> {
    const selectedCustomIntersectionPolylineAtom = atom((get) => {
        const customIntersectionPolylineId = get(
            settingsToViewInterface.getAtom("selectedCustomIntersectionPolylineId")
        );
        const customIntersectionPolylines = get(IntersectionPolylinesAtom);

        return customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId);
    });

    const intersectionReferenceSystemAtom = atom((get) => {
        const wellboreTrajectoryQuery = get(wellboreTrajectoryQueryAtom);
        const customIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));

        if (intersectionType === IntersectionType.WELLBORE) {
            if (!wellboreTrajectoryQuery.data) {
                return null;
            }

            const wellboreTrajectory = wellboreTrajectoryQuery.data;

            if (wellboreTrajectoryQuery) {
                const path: number[][] = [];
                for (const [index, northing] of wellboreTrajectory.northingArr.entries()) {
                    const easting = wellboreTrajectory.eastingArr[index];
                    const tvd_msl = wellboreTrajectory.tvdMslArr[index];

                    path.push([easting, northing, tvd_msl]);
                }
                const offset = wellboreTrajectory.mdArr[0];

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

    const polylineAtom = atom((get) => {
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));
        const intersectionExtensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));
        const selectedCustomIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
        const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);

        const polylineUtmXy: number[] = [];
        const actualSectionLengths: number[] = [];

        if (intersectionReferenceSystem) {
            if (intersectionType === IntersectionType.WELLBORE) {
                const path = intersectionReferenceSystem.path;
                const simplifiedCurveResult = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                    path,
                    intersectionExtensionLength,
                    CURVE_FITTING_EPSILON
                );
                polylineUtmXy.push(...simplifiedCurveResult.simplifiedWellboreTrajectoryXy.flat());
                actualSectionLengths.push(...simplifiedCurveResult.actualSectionLengths);
            } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && selectedCustomIntersectionPolyline) {
                for (const [index, point] of selectedCustomIntersectionPolyline.points.entries()) {
                    polylineUtmXy.push(point[0], point[1]);
                    if (index > 0) {
                        const previousPoint = selectedCustomIntersectionPolyline.points[index - 1];
                        actualSectionLengths.push(
                            pointDistance(arrayPointToPoint2D(point), arrayPointToPoint2D(previousPoint))
                        );
                    }
                }
            }
        }

        return {
            polylineUtmXy,
            actualSectionLengths,
        };
    });

    const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
        const wellbore = get(settingsToViewInterface.getAtom("wellboreHeader"));

        return {
            queryKey: ["getWellboreTrajectory", wellbore?.uuid ?? ""],
            queryFn: () => apiService.well.getWellTrajectories(wellbore?.uuid ? [wellbore.uuid] : []),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            select: (data: WellboreTrajectory_api[]) => data[0],
            enabled: wellbore?.uuid ? true : false,
        };
    });

    return {
        intersectionReferenceSystemAtom,
        polylineAtom,
        wellboreTrajectoryQueryAtom,
    };
}
